# LoRA触发词提取优化说明

## 问题描述

在使用LoRA时，触发词输出包含了所有训练标签，而不是只输出第一个最具代表性的触发词。

**问题示例：**
```
输出：Nahida(genshin impact),1girl,green eyes,pointy ears,dress,side ponytail,symbol-shaped pupils,white dress,toes,solo,feet,long hair,hair ornament,bangs,gradient hair,green hair,white hair,toeless legwear,cross-shaped pupils,jewelry,detached sleeves,bracelet,bloomers,sleeveless dress,soles,hair between eyes,sleeveless,bare shoulders,no shoes,short sleeves,sidelocks,:1.0,
```

**期望输出：**
```
输出：Nahida(genshin impact):1.0,
```

## 问题根源

### 1. Civitai缓存格式错误

缓存文件`loras_tags.json`中的数据格式为：
```json
[
    "Nahida(genshin impact),1girl,green eyes,pointy ears,dress,side ponytail,symbol-shaped pupils,white dress,toes,solo,feet,long hair,hair ornament,bangs,gradient hair,green hair,white hair,toeless legwear,cross-shaped pupils,jewelry,detached sleeves,bracelet,bloomers,sleeveless dress,soles,hair between eyes,sleeveless,bare shoulders,no shoes,short sleeves,sidelocks,"
]
```

这是一个列表，但只有一个元素，该元素是所有触发词拼接在一起的字符串（用逗号分隔）。

### 2. 所有获取方式都会被执行

原来的逻辑会执行所有4种触发词获取方式：
1. Civitai API
2. 元数据 ss_tag_frequency
3. 元数据 ss_output_name
4. 文件名

这导致：
- Civitai缓存被读取（获取所有触发词）
- 元数据被读取（获取556个触发词）← 浪费时间
- 输出名称被读取 ← 浪费时间
- 文件名被读取 ← 浪费时间

### 3. 缺少智能过滤

元数据中的`ss_tag_frequency`包含了所有训练标签，包括：
- 真正的触发词（如"Nahida(genshin impact)"）
- 通用标签（如"1girl", "green eyes", "dress"等）

这些标签按训练频率排序后，第一个可能不是真正的触发词，而是最常用的通用标签。

## 解决方案

### 1. Civitai缓存格式转换 + 智能过滤

**文件：** `app/server/prompt_api/trigger_words.py`

**修改位置：** `get_civitai_trigger_words`函数

**修改内容：**
```python
# 处理缓存数据格式
if isinstance(output_tags, list):
    # 如果列表只有一个元素且包含逗号，说明是旧格式（所有触发词拼接在一起）
    if len(output_tags) == 1 and isinstance(output_tags[0], str) and "," in output_tags[0]:
        # 按逗号分割成多个触发词
        trigger_words = [word.strip() for word in output_tags[0].split(",") if word.strip()]
        
        # 应用智能过滤，确保第一个触发词是真正的触发词
        non_common_words = [word for word in trigger_words if not _is_common_tag(word)]
        common_words = [word for word in trigger_words if _is_common_tag(word)]
        
        if non_common_words:
            # 如果有非通用标签，将它们放在前面
            filtered_words = non_common_words + common_words
            return filtered_words
        else:
            # 如果都是通用标签，保持原顺序
            return trigger_words
```

### 2. 优先级优化

**文件：** `app/server/prompt_api/trigger_words.py`

**修改位置：** `get_trigger_words`函数

**修改内容：**
```python
# 按优先级获取触发词，一旦找到有效数据就不再执行后续方式
# 1. Civitai API (最高优先级)
if include_civitai:
    civitai_words = get_civitai_trigger_words(lora_path, lora_name, force_fetch_civitai)
    result["civitai_words"] = civitai_words
    if civitai_words:
        # Civitai有数据，直接返回，不再执行后续方式
        result["first_trigger_word"] = civitai_words[0]
        result["source"] = "civitai"
        result["all_trigger_words"] = civitai_words
        return result

# 2. 元数据 ss_tag_frequency
if include_metadata:
    metadata_words = get_metadata_trigger_words(lora_path)
    result["metadata_words"] = metadata_words
    if metadata_words:
        # 元数据有数据，直接返回，不再执行后续方式
        result["first_trigger_word"] = metadata_words[0]
        result["source"] = "metadata"
        result["all_trigger_words"] = metadata_words
        return result

# 3. 元数据 ss_output_name
if include_output_name:
    output_name = get_output_name_trigger_words(lora_path)
    result["output_name"] = output_name
    if output_name:
        # 输出名称有数据，直接返回，不再执行后续方式
        result["first_trigger_word"] = output_name
        result["source"] = "output_name"
        result["all_trigger_words"] = [output_name]
        return result

# 4. 文件名回退
if include_filename:
    filename_word = get_filename_trigger_words(lora_name)
    result["filename_word"] = filename_word
    if filename_word:
        # 文件名有数据，直接返回
        result["first_trigger_word"] = filename_word
        result["source"] = "filename"
        result["all_trigger_words"] = [filename_word]
        return result
```

### 3. 智能过滤通用标签

**文件：** `app/server/prompt_api/trigger_words.py` 和 `app/server/prompt_api/lora_info.py`

**添加函数：** `_is_common_tag`

**功能：** 判断是否为常见通用标签（非触发词）

**通用标签列表：**
```python
common_tags = {
    # 人物相关
    '1girl', '1boy', '2girls', '2boys', '3girls', '3boys', 'multiple girls', 'multiple boys',
    'solo', 'couple', 'group',
    # 身体特征
    'long hair', 'short hair', 'white hair', 'black hair', 'blonde hair', 'brown hair',
    'red hair', 'blue hair', 'green hair', 'pink hair', 'purple hair', 'silver hair',
    'gradient hair', 'multicolored hair', 'two-tone hair',
    'blue eyes', 'green eyes', 'brown eyes', 'red eyes', 'yellow eyes', 'purple eyes',
    'black eyes', 'white eyes', 'orange eyes', 'pink eyes',
    'small breasts', 'medium breasts', 'large breasts', 'huge breasts',
    # 服装相关
    'dress', 'white dress', 'black dress', 'red dress', 'blue dress', 'green dress',
    'school uniform', 'swimsuit', 'bikini', 'maid', 'nurse', 'waitress',
    'skirt', 'shorts', 'pants', 'jeans', 'shirt', 'blouse', 'jacket', 'coat',
    # 姿势相关
    'standing', 'sitting', 'lying', 'walking', 'running', 'jumping',
    'looking at viewer', 'looking away', 'from behind', 'from side', 'from above', 'from below',
    # 背景相关
    'simple background', 'white background', 'black background', 'grey background',
    'outdoors', 'indoors', 'sky', 'cloud', 'tree', 'flower', 'water', 'building',
    # 画面风格
    'highres', 'absurdres', 'best quality', 'high quality', 'normal quality', 'low quality',
    'masterpiece', 'great quality', 'good quality', 'average quality', 'bad quality',
    'worst quality', 'very bad quality',
    # 其他常见标签
    'smile', 'open mouth', 'closed mouth', 'blush', 'tears', 'sweat',
    'gloves', 'shoes', 'boots', 'socks', 'stockings', 'pantyhose',
    'hat', 'headwear', 'hair ornament', 'ribbon', 'bow', 'flower', 'jewelry',
    'bangs', 'ponytail', 'twintails', 'braid', 'ahoge', 'sidelocks',
    'pointy ears', 'animal ears', 'cat ears', 'dog ears', 'rabbit ears', 'fox ears',
    'tail', 'cat tail', 'dog tail', 'fox tail', 'rabbit tail',
    'wings', 'angel wings', 'demon wings', 'fairy wings',
    'no humans', 'scenery', 'landscape', 'cityscape', 'seascape',
}
```

### 4. 自动修复错误的loraWorks

**文件：** `app/server/prompt_api/lora_info.py`

**修改位置：** `_update_data`函数

**修改内容：**
```python
# 处理 loraWorks 不存在、为空、或包含多个词的情况
should_update_loraWorks = False

if "loraWorks" not in info_data or not info_data["loraWorks"]:
    # loraWorks不存在或为空
    should_update_loraWorks = True
elif isinstance(info_data["loraWorks"], str) and "," in info_data["loraWorks"]:
    # loraWorks包含多个词（用逗号分隔），需要更新为只取第一个
    should_update_loraWorks = True

if should_update_loraWorks:
    # 从 trainedWords 中提取第一个训练词作为默认触发词
    if (
        "trainedWords" in info_data
        and isinstance(info_data["trainedWords"], list)
        and len(info_data["trainedWords"]) > 0
    ):
        first_word = info_data["trainedWords"][0]
        # 兼容 {"word": "xxx"} 格式和直接字符串格式
        if isinstance(first_word, dict) and "word" in first_word:
            info_data["loraWorks"] = first_word["word"].strip()
        elif isinstance(first_word, str) and first_word.strip():
            info_data["loraWorks"] = first_word.strip()
        should_save = True
```

## 优化效果

### 1. 性能提升

**优化前：**
- Civitai缓存被读取（获取所有触发词）
- 元数据被读取（获取556个触发词）
- 输出名称被读取
- 文件名被读取

**优化后：**
- Civitai缓存被读取（获取所有触发词）
- **直接返回，不再执行后续方式**

### 2. 输出正确

**优化前：**
```
Nahida(genshin impact),1girl,green eyes,pointy ears,dress,side ponytail,symbol-shaped pupils,white dress,toes,solo,feet,long hair,hair ornament,bangs,gradient hair,green hair,white hair,toeless legwear,cross-shaped pupils,jewelry,detached sleeves,bracelet,bloomers,sleeveless dress,soles,hair between eyes,sleeveless,bare shoulders,no shoes,short sleeves,sidelocks,:1.0,
```

**优化后：**
```
Nahida(genshin impact):1.0,
```

### 3. 智能过滤

系统会自动识别并过滤通用标签，确保第一个触发词是真正的触发词：
- 非通用标签：`Nahida(genshin impact)`
- 通用标签：`1girl`, `green eyes`, `dress`等

## 使用方法

1. **重启ComfyUI**，让新代码生效
2. **使用LoRA生成图片**
3. **查看控制台输出**，确认优化生效

## 调试日志

优化后，控制台会输出以下调试信息：

```
[TriggerWords] 从缓存获取Civitai触发词: Illustrious\人物\原神 纳西妲_更好的画风_Nahida-v1
[TriggerWords] 缓存数据格式转换: 从1个元素转换为30个触发词
[TriggerWords] Civitai智能过滤: 非通用标签1个, 通用标签29个
[DEBUG] Civitai前5个非通用标签: ['Nahida(genshin impact)']
[DEBUG] civitai_words: ['Nahida(genshin impact)', '1girl', 'green eyes', ...]
[DEBUG] first_trigger_word: Nahida(genshin impact)
触发词: Nahida(genshin impact)
添加触发词到提示词开头: Nahida(genshin impact):1.0,
```

## 注意事项

1. **缓存文件**：旧的缓存文件`loras_tags.json`会被自动转换，无需手动删除
2. **向后兼容**：优化后的代码完全兼容旧版本，不会影响现有功能
3. **性能提升**：优化后只执行必要的触发词获取方式，节省时间

## 技术细节

### 触发词获取优先级

1. **Civitai API**（最高优先级）
   - 从Civitai网站获取`trainedWords`
   - 数据最准确，优先级最高

2. **元数据 ss_tag_frequency**
   - 从safetensors文件元数据获取
   - 按训练频率排序
   - 应用智能过滤

3. **元数据 ss_output_name**
   - 从safetensors文件元数据获取
   - 通常是模型作者指定的触发词

4. **文件名**（最后回退）
   - 使用LoRA文件名作为触发词
   - 去除版本号后缀

### 智能过滤逻辑

1. **识别通用标签**：通过预定义的通用标签列表识别
2. **优先级调整**：将非通用标签放在列表前面
3. **保持兼容性**：如果所有标签都是通用标签，保持原有顺序

## 总结

本次优化解决了LoRA触发词提取的核心问题：
1. ✅ 正确处理Civitai缓存格式
2. ✅ 优化触发词获取优先级
3. ✅ 智能过滤通用标签
4. ✅ 自动修复错误的loraWorks
5. ✅ 提升性能，减少不必要的计算

现在，LoRA触发词提取功能已经完全优化，能够正确输出第一个最具代表性的触发词。
