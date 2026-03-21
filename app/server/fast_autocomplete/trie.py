"""
Trie树数据结构实现

用于高效的前缀搜索和自动补全。
时间复杂度：O(m) 其中m是查询字符串的长度
"""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class TrieNode:
    """Trie树节点"""

    children: dict[str, "TrieNode"] = field(default_factory=dict)
    is_end: bool = False
    data: dict[str, Any] | None = None
    score: int = 0  # 匹配分数/权重


class Trie:
    """Trie树实现"""

    def __init__(self):
        self.root = TrieNode()
        self._size = 0

    def insert(self, word: str, data: dict[str, Any], score: int = 0) -> None:
        """
        插入单词到Trie树

        Args:
            word: 要插入的单词
            data: 与单词关联的数据
            score: 匹配分数/权重
        """
        node = self.root
        word_lower = word.lower()

        for char in word_lower:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]

        # 只有新插入时才增加计数
        if not node.is_end:
            self._size += 1

        node.is_end = True
        node.data = data
        node.score = score

    def search(self, word: str) -> dict[str, Any] | None:
        """
        精确搜索单词

        Args:
            word: 要搜索的单词

        Returns:
            找到则返回关联数据，否则返回None
        """
        node = self._find_node(word)
        if node and node.is_end:
            return node.data
        return None

    def starts_with(self, prefix: str) -> bool:
        """
        检查是否存在以指定前缀开头的单词

        Args:
            prefix: 前缀

        Returns:
            是否存在
        """
        return self._find_node(prefix) is not None

    def search_prefix(self, prefix: str, limit: int = 10) -> list[dict[str, Any]]:
        """
        搜索前缀匹配的所有单词

        Args:
            prefix: 前缀
            limit: 返回结果数量限制

        Returns:
            匹配结果列表，按分数降序排列
        """
        node = self._find_node(prefix)
        if not node:
            return []

        # 收集所有匹配结果
        results: list[dict[str, Any]] = []
        self._collect_all(node, prefix, results)

        # 按分数排序，返回前limit个
        results.sort(key=lambda x: x.get("score", 0), reverse=True)
        return results[:limit]

    def _find_node(self, prefix: str) -> TrieNode | None:
        """查找前缀对应的节点"""
        node = self.root
        prefix_lower = prefix.lower()

        for char in prefix_lower:
            if char not in node.children:
                return None
            node = node.children[char]

        return node

    def _collect_all(
        self, node: TrieNode, prefix: str, results: list[dict[str, Any]]
    ) -> None:
        """递归收集所有匹配结果"""
        if node.is_end and node.data:
            result = {**node.data, "score": node.score}
            results.append(result)

        for char, child in node.children.items():
            self._collect_all(child, prefix + char, results)

    def clear(self) -> None:
        """清空Trie树"""
        self.root = TrieNode()
        self._size = 0

    @property
    def size(self) -> int:
        """获取Trie树中单词数量"""
        return self._size


class FuzzyTrie(Trie):
    """支持模糊搜索的Trie树"""

    def fuzzy_search(
        self, query: str, max_distance: int = 2, limit: int = 10
    ) -> list[dict[str, Any]]:
        """
        模糊搜索（基于编辑距离）

        Args:
            query: 查询字符串
            max_distance: 最大编辑距离
            limit: 返回结果数量限制

        Returns:
            匹配结果列表
        """
        results: list[dict[str, Any]] = []
        query_lower = query.lower()

        # 使用BFS遍历Trie树，计算编辑距离
        self._fuzzy_search_recursive(self.root, "", query_lower, max_distance, results)

        # 按编辑距离和分数排序
        results.sort(key=lambda x: (x.get("distance", 0), -x.get("score", 0)))

        return results[:limit]

    def _fuzzy_search_recursive(
        self,
        node: TrieNode,
        current: str,
        query: str,
        max_distance: int,
        results: list[dict[str, Any]],
    ) -> None:
        """递归模糊搜索"""
        # 计算当前字符串与查询的编辑距离
        distance = self._levenshtein_distance(current, query)

        # 如果距离超过最大值，剪枝
        if distance > max_distance and len(current) > len(query) + max_distance:
            return

        # 如果是单词结尾且距离在范围内
        if node.is_end and node.data and distance <= max_distance:
            result = {**node.data, "score": node.score, "distance": distance}
            results.append(result)

        # 继续搜索子节点
        for char, child in node.children.items():
            self._fuzzy_search_recursive(
                child, current + char, query, max_distance, results
            )

    @staticmethod
    def _levenshtein_distance(s1: str, s2: str) -> int:
        """计算Levenshtein编辑距离"""
        if len(s1) < len(s2):
            return FuzzyTrie._levenshtein_distance(s2, s1)

        if len(s2) == 0:
            return len(s1)

        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row

        return previous_row[-1]


# 全局Trie树实例
_trie_instance: FuzzyTrie | None = None
_trie_initialized = False


def get_trie() -> FuzzyTrie:
    """获取Trie树单例"""
    global _trie_instance
    if _trie_instance is None:
        _trie_instance = FuzzyTrie()
    return _trie_instance


def is_trie_initialized() -> bool:
    """检查Trie树是否已初始化"""
    return _trie_initialized


def set_trie_initialized(value: bool) -> None:
    """设置Trie树初始化状态"""
    global _trie_initialized
    _trie_initialized = value


def clear_trie() -> None:
    """清空Trie树"""
    global _trie_instance, _trie_initialized
    if _trie_instance:
        _trie_instance.clear()
    _trie_initialized = False
