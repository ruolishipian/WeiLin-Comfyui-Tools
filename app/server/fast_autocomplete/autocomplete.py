from ..dao.dao import fetch_all
from .trie import get_trie, is_trie_initialized, set_trie_initialized

# 拼音支持
try:
    from pypinyin import lazy_pinyin, Style

    def _get_pinyin(text):
        """获取文本的拼音（无声调，连续小写）"""
        if not text:
            return ""
        return "".join(lazy_pinyin(text, style=Style.NORMAL))

    _PYPINYIN_AVAILABLE = True
except ImportError:
    _PYPINYIN_AVAILABLE = False

    def _get_pinyin(text):
        return ""


def _contains_chinese(text):
    """检查文本是否包含中文字符"""
    if not text:
        return False
    for ch in text:
        if "\u4e00" <= ch <= "\u9fff":
            return True
    return False


async def fuzzy_search(query, limit=10):
    """模糊查询，先查询 tag_tags 表，然后查询 danbooru_tag 表，按匹配度排序

    支持拼音搜索：当查询为纯小写字母时，会通过原表 pinyin 列匹配中文翻译。
    """
    results = []
    existing_texts = set()

    # 判断查询是否可能为拼音（纯小写字母，不含中文）
    is_pinyin_query = query.isalpha() and query.islower() and not _contains_chinese(query)

    # 查询 tag_tags 表
    tag_tags_query = """
        SELECT text, desc, color, -1 AS color_id,
               CASE
                   WHEN text = ? THEN 100
                   WHEN text LIKE ? THEN 90
                   WHEN text LIKE ? THEN 80
                   WHEN desc = ? THEN 70
                   WHEN desc LIKE ? THEN 60
                   WHEN desc LIKE ? THEN 50
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
            query,
            f"{query}%",
            f"%{query}%",
            query,
            f"{query}%",
            f"%{query}%",
            f"%{query}%",
            f"%{query}%",
            limit,
        ),
    )

    for result in tag_tags_results:
        text, desc, color, color_id, match_score = result
        if text not in existing_texts:
            existing_texts.add(text)
            results.append(
                {
                    "text": text,
                    "desc": desc,
                    "color": color,
                    "color_id": color_id,
                    "match_score": match_score,
                }
            )

    # 查询 danbooru_tag 表
    if len(results) < limit:
        remaining_limit = limit - len(results)
        danbooru_tag_query = """
            SELECT tag, translate, NULL AS color, color_id,
                   CASE
                       WHEN tag = ? THEN 100
                       WHEN tag LIKE ? THEN 90
                       WHEN tag LIKE ? THEN 80
                       WHEN translate = ? THEN 70
                       WHEN translate LIKE ? THEN 60
                       WHEN translate LIKE ? THEN 50
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
                query,
                f"{query}%",
                f"%{query}%",
                query,
                f"{query}%",
                f"%{query}%",
                f"%{query}%",
                f"%{query}%",
                remaining_limit,
            ),
        )

        for result in danbooru_tag_results:
            tag, translate, color, color_id, match_score = result
            if tag not in existing_texts:
                existing_texts.add(tag)
                results.append(
                    {
                        "text": tag,
                        "desc": translate,
                        "color": color,
                        "color_id": color_id,
                        "match_score": match_score,
                    }
                )

    # 拼音搜索：通过原表 pinyin 列匹配
    if is_pinyin_query and _PYPINYIN_AVAILABLE and len(results) < limit:
        remaining = limit - len(results)

        # 搜索 tag_tags 的 pinyin 列
        tags_pinyin_query = """
            SELECT text, desc, color, -1 AS color_id
            FROM tag_tags
            WHERE pinyin LIKE ?
            LIMIT ?
        """
        tags_pinyin_results = await fetch_all(
            "tags",
            tags_pinyin_query,
            (f"%{query}%", remaining),
        )

        for result in tags_pinyin_results:
            text, desc, color, color_id = result
            if text not in existing_texts:
                existing_texts.add(text)
                results.append(
                    {
                        "text": text,
                        "desc": desc,
                        "color": color,
                        "color_id": color_id,
                        "match_score": 55,
                    }
                )

        # 搜索 danbooru_tag 的 pinyin 列
        if len(results) < limit:
            remaining = limit - len(results)
            danbooru_pinyin_query = """
                SELECT tag, translate, NULL AS color, color_id
                FROM danbooru_tag
                WHERE pinyin LIKE ?
                LIMIT ?
            """
            danbooru_pinyin_results = await fetch_all(
                "danbooru",
                danbooru_pinyin_query,
                (f"%{query}%", remaining),
            )

            for result in danbooru_pinyin_results:
                tag, translate, color, color_id = result
                if tag not in existing_texts:
                    existing_texts.add(tag)
                    results.append(
                        {
                            "text": tag,
                            "desc": translate,
                            "color": color,
                            "color_id": color_id,
                            "match_score": 55,
                        }
                    )

    # 根据匹配分数对所有结果进行排序
    results.sort(key=lambda x: x["match_score"], reverse=True)

    # 移除匹配分数字段，返回前limit个结果
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
    同时为中文翻译生成拼音索引，支持拼音搜索。
    应在应用启动时异步调用。
    """
    if is_trie_initialized():
        return

    trie = get_trie()
    trie.clear()

    # 加载 tag_tags 表数据（包含 pinyin 列）
    tag_tags_query = "SELECT text, desc, color, pinyin FROM tag_tags"
    tag_tags_results = await fetch_all("tags", tag_tags_query, ())

    for result in tag_tags_results:
        text, desc, color, pinyin = result
        trie.insert(
            text,
            {"text": text, "desc": desc or "", "color": color, "color_id": -1},
            score=100,
        )
        # 使用预计算的拼音列
        if _PYPINYIN_AVAILABLE and pinyin:
            trie.insert(
                pinyin,
                {"text": text, "desc": desc or "", "color": color, "color_id": -1},
                score=55,
            )

    # 加载 danbooru_tag 表数据（包含 pinyin 列）
    danbooru_query = "SELECT tag, translate, color_id, pinyin FROM danbooru_tag"
    danbooru_results = await fetch_all("danbooru", danbooru_query, ())

    for result in danbooru_results:
        tag, translate, color_id, pinyin = result
        trie.insert(
            tag,
            {"text": tag, "desc": translate or "", "color": None, "color_id": color_id},
            score=80,
        )
        # 使用预计算的拼音列
        if _PYPINYIN_AVAILABLE and pinyin:
            trie.insert(
                pinyin,
                {
                    "text": tag,
                    "desc": translate or "",
                    "color": None,
                    "color_id": color_id,
                },
                score=55,
            )

    set_trie_initialized(True)
    print(f"Trie index initialized with {trie.size} entries")
