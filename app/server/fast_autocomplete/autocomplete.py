from ..dao.dao import fetch_all
from .trie import get_trie, is_trie_initialized, set_trie_initialized


async def fuzzy_search(query, limit=10):
    """模糊查询，先查询 tag_tags 表，然后查询 danbooru_tag 表，按匹配度排序"""
    results = []

    # 查询 tag_tags 表，添加排序逻辑
    tag_tags_query = """
        SELECT text, desc, color, -1 AS color_id,
               CASE
                   WHEN text = ? THEN 100  -- 完全匹配
                   WHEN text LIKE ? THEN 90  -- 前缀匹配
                   WHEN text LIKE ? THEN 80  -- 包含匹配
                   WHEN desc = ? THEN 70  -- 描述完全匹配
                   WHEN desc LIKE ? THEN 60  -- 描述前缀匹配
                   WHEN desc LIKE ? THEN 50  -- 描述包含匹配
                   ELSE 0
               END AS match_score
        FROM tag_tags
        WHERE text LIKE ? OR desc LIKE ?
        ORDER BY match_score DESC
        LIMIT ?
    """
    tag_tags_results = await fetch_all(
        "tags",
        tag_tags_query,
        (
            query,  # 完全匹配
            f"{query}%",  # 前缀匹配
            f"%{query}%",  # 包含匹配
            query,  # 描述完全匹配
            f"{query}%",  # 描述前缀匹配
            f"%{query}%",  # 描述包含匹配
            f"%{query}%",  # WHERE条件
            f"%{query}%",  # WHERE条件
            limit,  # 限制返回条数
        ),
    )

    for result in tag_tags_results:
        results.append(
            {
                "text": result[0],
                "desc": result[1],
                "color": result[2],
                "color_id": result[3],
                "match_score": result[4],  # 保存匹配分数用于后续排序
            }
        )

    # 如果结果不足十个，继续查询 danbooru_tag 表
    if len(results) < limit:
        remaining_limit = limit - len(results)
        danbooru_tag_query = """
            SELECT tag, translate, NULL AS color, color_id,
                   CASE
                       WHEN tag = ? THEN 100  -- 完全匹配
                       WHEN tag LIKE ? THEN 90  -- 前缀匹配
                       WHEN tag LIKE ? THEN 80  -- 包含匹配
                       WHEN translate = ? THEN 70  -- 翻译完全匹配
                       WHEN translate LIKE ? THEN 60  -- 翻译前缀匹配
                       WHEN translate LIKE ? THEN 50  -- 翻译包含匹配
                       ELSE 0
                   END AS match_score
            FROM danbooru_tag
            WHERE tag LIKE ? OR translate LIKE ?
            ORDER BY match_score DESC
            LIMIT ?
        """
        danbooru_tag_results = await fetch_all(
            "danbooru",
            danbooru_tag_query,
            (
                query,  # 完全匹配
                f"{query}%",  # 前缀匹配
                f"%{query}%",  # 包含匹配
                query,  # 翻译完全匹配
                f"{query}%",  # 翻译前缀匹配
                f"%{query}%",  # 翻译包含匹配
                f"%{query}%",  # WHERE条件
                f"%{query}%",  # WHERE条件
                remaining_limit,
            ),
        )

        for result in danbooru_tag_results:
            results.append(
                {
                    "text": result[0],
                    "desc": result[1],
                    "color": result[2],
                    "color_id": result[3],
                    "match_score": result[4],  # 保存匹配分数
                }
            )

    # 根据匹配分数对所有结果进行排序
    results.sort(key=lambda x: x["match_score"], reverse=True)

    # 移除匹配分数字段，返回前10个结果
    for result in results:
        if "match_score" in result:
            del result["match_score"]

    return results[:limit]


async def fuzzy_search_optimized(query: str, limit: int = 10) -> list:
    """
    使用Trie树优化的模糊搜索

    优先从Trie树获取前缀匹配结果，如果结果不足则回退到数据库查询。

    Args:
        query: 查询字符串
        limit: 返回结果数量限制

    Returns:
        匹配结果列表
    """
    trie = get_trie()

    # 如果Trie树已初始化，优先使用Trie搜索
    if is_trie_initialized() and trie.size > 0:
        # 1. 先从Trie树获取前缀匹配结果
        prefix_results = trie.search_prefix(query, limit * 2)

        # 2. 如果结果不足，进行模糊搜索
        if len(prefix_results) < limit:
            fuzzy_results = trie.fuzzy_search(query, max_distance=2, limit=limit)

            # 合并结果，去重
            existing_texts = {r.get("text") for r in prefix_results}
            for r in fuzzy_results:
                if r.get("text") not in existing_texts:
                    prefix_results.append(r)
                    existing_texts.add(r.get("text"))

        # 3. 按分数排序返回
        prefix_results.sort(key=lambda x: x.get("score", 0), reverse=True)

        # 清理内部字段
        for result in prefix_results:
            result.pop("distance", None)

        return prefix_results[:limit]

    # Trie树未初始化，回退到数据库查询
    return await fuzzy_search(query, limit)


async def init_trie_index() -> None:
    """
    初始化Trie树索引

    从数据库加载所有标签数据到Trie树中。
    应在应用启动时异步调用。
    """
    if is_trie_initialized():
        return

    trie = get_trie()
    trie.clear()

    # 加载 tag_tags 表数据
    tag_tags_query = "SELECT text, desc, color FROM tag_tags"
    tag_tags_results = await fetch_all("tags", tag_tags_query, ())

    for result in tag_tags_results:
        text, desc, color = result
        trie.insert(
            text,
            {"text": text, "desc": desc or "", "color": color, "color_id": -1},
            score=100,
        )

    # 加载 danbooru_tag 表数据
    danbooru_query = "SELECT tag, translate, color_id FROM danbooru_tag"
    danbooru_results = await fetch_all("danbooru", danbooru_query, ())

    for result in danbooru_results:
        tag, translate, color_id = result
        trie.insert(
            tag,
            {"text": tag, "desc": translate or "", "color": None, "color_id": color_id},
            score=80,
        )

    set_trie_initialized(True)
    print(f"Trie index initialized with {trie.size} entries")
