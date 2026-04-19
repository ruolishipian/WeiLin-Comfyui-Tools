"""
拼音索引模块

直接在原数据库表中添加 pinyin 列，用于支持中文拼音搜索自动补全。

特性：
- 无需独立索引数据库，拼音列直接存于原表
- 启动时检测 pinyin 列是否存在空值，按需填充
- 批量更新优化，首次生成约几秒完成
- 后台线程执行，不阻塞启动
"""

import sqlite3
import threading

try:
    from pypinyin import lazy_pinyin, Style

    _PYPINYIN_AVAILABLE = True
except ImportError:
    _PYPINYIN_AVAILABLE = False


def _get_pinyin(text):
    """获取文本的拼音（无声调，连续小写）"""
    if not text:
        return ""
    return "".join(lazy_pinyin(text, style=Style.NORMAL))


def _contains_chinese(text):
    """检查文本是否包含中文字符"""
    if not text:
        return False
    for ch in text:
        if "\u4e00" <= ch <= "\u9fff":
            return True
    return False


def compute_pinyin(text):
    """
    计算文本的拼音，供外部调用。

    如果文本包含中文则返回拼音字符串，否则返回空字符串。
    当 pypinyin 不可用时始终返回空字符串。

    Args:
        text: 中文文本（如翻译/描述）

    Returns:
        str: 拼音字符串（如 "yazi"）或空字符串
    """
    if not _PYPINYIN_AVAILABLE or not text or not _contains_chinese(text):
        return ""
    return _get_pinyin(text)


def _ensure_pinyin_columns(conn, table, translate_col):
    """确保表中有 pinyin 列，不存在则添加"""
    cursor = conn.execute(f"PRAGMA table_info({table})")
    columns = [info[1] for info in cursor.fetchall()]
    if "pinyin" not in columns:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN pinyin TEXT DEFAULT ''")
        conn.commit()
        return True  # 新增了列，需要填充
    return False


def _fill_danbooru_pinyin(danbooru_db_path):
    """填充 danbooru_tag 表的 pinyin 列"""
    conn = sqlite3.connect(danbooru_db_path)
    try:
        new_column = _ensure_pinyin_columns(conn, "danbooru_tag", "translate")

        # 检查是否有需要填充的行（pinyin 为空但有中文翻译的行）
        cursor = conn.execute(
            "SELECT COUNT(*) FROM danbooru_tag WHERE (pinyin IS NULL OR pinyin = '') AND translate IS NOT NULL AND translate != ''"
        )
        empty_count = cursor.fetchone()[0]
        if empty_count == 0 and not new_column:
            return 0

        # 批量读取需要填充的行
        cursor = conn.execute(
            "SELECT id_index, translate FROM danbooru_tag WHERE (pinyin IS NULL OR pinyin = '') AND translate IS NOT NULL AND translate != ''"
        )
        rows = cursor.fetchall()

        # 批量计算拼音并更新
        count = 0
        for id_index, translate in rows:
            pinyin = ""
            if translate and _contains_chinese(translate):
                pinyin = _get_pinyin(translate)
            conn.execute(
                "UPDATE danbooru_tag SET pinyin = ? WHERE id_index = ?",
                (pinyin, id_index),
            )
            count += 1

        conn.commit()

        # 确保索引存在
        conn.execute("CREATE INDEX IF NOT EXISTS idx_danbooru_pinyin ON danbooru_tag(pinyin)")
        conn.commit()

        return count
    finally:
        conn.close()


def _fill_tags_pinyin(tags_db_path):
    """填充 tag_tags 表的 pinyin 列"""
    conn = sqlite3.connect(tags_db_path)
    try:
        new_column = _ensure_pinyin_columns(conn, "tag_tags", "desc")

        # 检查是否有需要填充的行
        cursor = conn.execute(
            "SELECT COUNT(*) FROM tag_tags WHERE (pinyin IS NULL OR pinyin = '') AND desc IS NOT NULL AND desc != ''"
        )
        empty_count = cursor.fetchone()[0]
        if empty_count == 0 and not new_column:
            return 0

        # 分批读取和更新（24万行，分批处理避免内存峰值）
        BATCH_SIZE = 5000
        count = 0
        offset = 0

        while True:
            cursor = conn.execute(
                "SELECT id_index, desc FROM tag_tags WHERE (pinyin IS NULL OR pinyin = '') AND desc IS NOT NULL AND desc != '' LIMIT ? OFFSET ?",
                (BATCH_SIZE, offset),
            )
            rows = cursor.fetchall()
            if not rows:
                break

            for id_index, desc in rows:
                pinyin = ""
                if desc and _contains_chinese(desc):
                    pinyin = _get_pinyin(desc)
                conn.execute(
                    "UPDATE tag_tags SET pinyin = ? WHERE id_index = ?",
                    (pinyin, id_index),
                )
                count += 1

            conn.commit()
            # 因为是按条件更新，已更新的行不会再被查到，offset 始终为 0
            offset = 0

        # 确保索引存在
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tag_tags_pinyin ON tag_tags(pinyin)")
        conn.commit()

        return count
    finally:
        conn.close()


def _do_fill(danbooru_db_path, tags_db_path):
    """执行拼音列填充（内部函数）"""
    if not _PYPINYIN_AVAILABLE:
        print("[pinyin_index] pypinyin not available, skip pinyin fill")
        return False

    try:
        print("[pinyin_index] Filling pinyin columns...")
        danbooru_count = _fill_danbooru_pinyin(danbooru_db_path)
        tags_count = _fill_tags_pinyin(tags_db_path)
        print(f"[pinyin_index] Filled: {danbooru_count} danbooru, {tags_count} tags rows")
        return True
    except Exception as e:
        print(f"[pinyin_index] Error filling pinyin: {e}")
        return False


def fill_pinyin_columns(danbooru_db_path, tags_db_path, background=True):
    """
    填充原表拼音列

    Args:
        danbooru_db_path: danbooru数据库路径
        tags_db_path: tags数据库路径
        background: 是否在后台线程执行（不阻塞启动）

    Returns:
        bool: 是否触发了填充（background=True时始终返回True）
    """
    if not _PYPINYIN_AVAILABLE:
        return False

    if background:
        thread = threading.Thread(
            target=_do_fill,
            args=(danbooru_db_path, tags_db_path),
            daemon=True,
        )
        thread.start()
        return True
    else:
        return _do_fill(danbooru_db_path, tags_db_path)
