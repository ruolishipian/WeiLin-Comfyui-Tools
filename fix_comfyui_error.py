#!/usr/bin/env python3
"""
ComfyUI前端管理错误自动修复脚本
用于解决 AttributeError: 'NoneType' object has no attribute 'get' 错误
"""

import os
import subprocess


def run_command(command, description):
    """运行命令并显示结果"""
    print(f"\n{'='*60}")
    print(f"执行: {description}")
    print(f"命令: {command}")
    print(f"{'='*60}")

    try:
        result = subprocess.run(
            command, shell=True, capture_output=True, text=True, timeout=300
        )

        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print("错误输出:", result.stderr)

        return result.returncode == 0
    except subprocess.TimeoutExpired:
        print("错误: 命令执行超时")
        return False
    except Exception as e:
        print(f"错误: {str(e)}")
        return False


def check_python_environment():
    """检查Python环境"""
    print("\n" + "=" * 60)
    print("第一步: 检查Python环境")
    print("=" * 60)

    run_command("python --version", "检查Python版本")
    run_command("python -m pip --version", "检查pip版本")

    # 升级pip
    run_command("python -m pip install --upgrade pip", "升级pip")


def fix_comfyui_frontend():
    """修复ComfyUI前端包"""
    print("\n" + "=" * 60)
    print("第二步: 修复ComfyUI前端包")
    print("=" * 60)

    # 方案1: 升级comfyui-frontend-package
    print("\n尝试方案1: 升级comfyui-frontend-package")
    if not run_command(
        "python -m pip install --upgrade comfyui-frontend-package",
        "升级comfyui-frontend-package",
    ):
        print("升级失败，尝试重新安装...")

        # 方案2: 重新安装
        print("\n尝试方案2: 重新安装comfyui-frontend-package")
        run_command(
            "python -m pip uninstall comfyui-frontend-package -y",
            "卸载comfyui-frontend-package",
        )
        run_command(
            "python -m pip install comfyui-frontend-package",
            "安装comfyui-frontend-package",
        )


def fix_comfyui_manager():
    """修复comfyui-manager"""
    print("\n" + "=" * 60)
    print("第三步: 修复comfyui-manager")
    print("=" * 60)

    print("\n尝试升级comfyui-manager")
    if not run_command(
        "python -m pip install --upgrade comfyui-manager", "升级comfyui-manager"
    ):
        print("升级失败，尝试重新安装...")

        # 重新安装
        print("\n尝试重新安装comfyui-manager")
        run_command("python -m pip uninstall comfyui-manager -y", "卸载comfyui-manager")
        run_command("python -m pip install comfyui-manager", "安装comfyui-manager")


def update_comfyui():
    """更新ComfyUI"""
    print("\n" + "=" * 60)
    print("第四步: 更新ComfyUI（如果可用）")
    print("=" * 60)

    # 检查是否在Git仓库中
    if os.path.exists(".git"):
        print("检测到Git仓库，尝试更新ComfyUI...")
        run_command("git pull", "拉取最新代码")
    else:
        print("未检测到Git仓库，跳过ComfyUI更新")


def verify_fix():
    """验证修复结果"""
    print("\n" + "=" * 60)
    print("第五步: 验证修复结果")
    print("=" * 60)

    # 检查关键包是否已安装
    packages_to_check = ["comfyui-frontend-package", "comfyui-manager"]

    all_installed = True
    for package in packages_to_check:
        result = run_command(f"python -m pip show {package}", f"检查{package}安装状态")
        if not result:
            all_installed = False
            print(f"警告: {package} 可能未正确安装")

    if all_installed:
        print("\n✅ 所有关键包已正确安装")
        print("建议重启ComfyUI服务器以应用更改")
    else:
        print("\n❌ 部分包可能未正确安装，请手动检查")


def main():
    """主函数"""
    print("""
╔════════════════════════════════════════════════════════════╗
║     ComfyUI前端管理错误自动修复工具                         ║
║     用于解决 AttributeError 错误                           ║
╚════════════════════════════════════════════════════════════╝
    """)

    print("开始修复流程...")

    try:
        check_python_environment()
        fix_comfyui_frontend()
        fix_comfyui_manager()
        update_comfyui()
        verify_fix()

        print("\n" + "=" * 60)
        print("修复流程完成！")
        print("=" * 60)
        print("\n建议操作:")
        print("1. 重启ComfyUI服务器")
        print("2. 如果问题仍然存在，请查看 COMFYUI_ERROR_FIX.md 文档")
        print("3. 或联系官方QQ群: 1018231382")

    except KeyboardInterrupt:
        print("\n\n用户中断了修复过程")
    except Exception as e:
        print(f"\n\n修复过程中发生错误: {str(e)}")
        print("请手动执行修复步骤")


if __name__ == "__main__":
    main()
