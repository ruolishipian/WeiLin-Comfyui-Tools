"""
翻译结果LRU缓存模块

提供翻译结果的内存缓存，减少数据库查询次数，提升翻译响应速度。
"""

import time
from collections import OrderedDict


class TranslationLRUCache:
    """
    翻译结果LRU缓存类

    使用OrderedDict实现LRU淘汰策略，支持TTL过期时间。
    """

    def __init__(self, max_size: int = 1000, ttl: int | None = None):
        """
        初始化LRU缓存

        Args:
            max_size: 缓存最大容量，默认1000
            ttl: 缓存过期时间（秒），None表示永不过期
        """
        self.max_size = max_size
        self.ttl = ttl
        self._cache: OrderedDict[str, dict] = OrderedDict()
        self._stats = {"hits": 0, "misses": 0, "evictions": 0}

    def _normalize_key(self, key: str) -> str:
        """标准化缓存键：小写、去空格"""
        return key.lower().strip()

    def _is_expired(self, entry: dict) -> bool:
        """检查缓存条目是否过期"""
        if self.ttl is None:
            return False
        return time.time() - entry["timestamp"] > self.ttl

    def get(self, key: str) -> dict | None:
        """
        获取缓存值

        Args:
            key: 缓存键（单词）

        Returns:
            缓存的翻译结果，未命中或过期返回None
        """
        normalized_key = self._normalize_key(key)

        if normalized_key not in self._cache:
            self._stats["misses"] += 1
            return None

        entry = self._cache[normalized_key]

        # 检查是否过期
        if self._is_expired(entry):
            self._cache.pop(normalized_key)
            self._stats["misses"] += 1
            return None

        # 移到最后表示最近使用（LRU策略）
        self._cache.move_to_end(normalized_key)
        self._stats["hits"] += 1
        return entry["value"]

    def set(self, key: str, value: dict) -> None:
        """
        设置缓存值

        Args:
            key: 缓存键（单词）
            value: 翻译结果
        """
        normalized_key = self._normalize_key(key)

        # 如果已存在，先删除
        if normalized_key in self._cache:
            self._cache.pop(normalized_key)
        # 如果缓存已满，删除最久未使用的
        elif len(self._cache) >= self.max_size:
            self._cache.popitem(last=False)
            self._stats["evictions"] += 1

        # 添加新条目
        self._cache[normalized_key] = {"value": value, "timestamp": time.time()}

    def delete(self, key: str) -> bool:
        """
        删除缓存条目

        Args:
            key: 缓存键

        Returns:
            是否成功删除
        """
        normalized_key = self._normalize_key(key)
        if normalized_key in self._cache:
            self._cache.pop(normalized_key)
            return True
        return False

    def clear(self) -> None:
        """清空缓存"""
        self._cache.clear()
        self._stats = {"hits": 0, "misses": 0, "evictions": 0}

    def get_stats(self) -> dict:
        """
        获取缓存统计信息

        Returns:
            包含命中率、大小等统计信息的字典
        """
        total_requests = self._stats["hits"] + self._stats["misses"]
        hit_rate = self._stats["hits"] / total_requests if total_requests > 0 else 0

        return {
            "size": len(self._cache),
            "max_size": self.max_size,
            "hits": self._stats["hits"],
            "misses": self._stats["misses"],
            "evictions": self._stats["evictions"],
            "hit_rate": hit_rate,
        }


# 全局缓存实例
_translation_cache = TranslationLRUCache(max_size=1000, ttl=None)


def get_translation_cache() -> TranslationLRUCache:
    """获取全局翻译缓存实例"""
    return _translation_cache


def clear_translation_cache() -> None:
    """清空翻译缓存（在数据更新时调用）"""
    _translation_cache.clear()
