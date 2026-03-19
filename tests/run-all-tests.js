/**
 * WeiLin-ComfyUI-Tools 测试运行器
 * 
 * 统一运行所有测试文件
 * 
 * 运行方式: node tests/run-all-tests.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('\n============================================');
console.log('WeiLin-ComfyUI-Tools 测试套件');
console.log('============================================\n');

const testFiles = [
  { name: '空值处理测试', file: 'empty-value-handling.test.js' },
  { name: '核心功能测试', file: 'core-functions.test.js' },
  { name: 'API 接口测试', file: 'api-interfaces.test.js' },
  { name: '数据处理测试', file: 'data-processing.test.js' },
  { name: '节点输出格式测试', file: 'node-output-format.test.js' }
];

let totalPass = 0;
let totalFail = 0;
const results = [];

for (const { name, file } of testFiles) {
  console.log(`\n--------------------------------------------`);
  console.log(`运行: ${name}`);
  console.log(`--------------------------------------------\n`);
  
  try {
    const output = execSync(`node ${path.join(__dirname, file)}`, {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    console.log(output);
    
    // 解析输出获取通过/失败数
    const passMatch = output.match(/总计: ✅ (\d+) 通过/);
    const failMatch = output.match(/❌ (\d+) 失败/);
    
    const pass = passMatch ? parseInt(passMatch[1]) : 0;
    const fail = failMatch ? parseInt(failMatch[1]) : 0;
    
    totalPass += pass;
    totalFail += fail;
    
    results.push({ name, pass, fail, status: fail === 0 ? 'PASS' : 'FAIL' });
  } catch (error) {
    console.log(`❌ 测试文件执行失败: ${file}`);
    console.log(error.message);
    results.push({ name, pass: 0, fail: 1, status: 'ERROR' });
    totalFail++;
  }
}

// 最终汇总
console.log('\n============================================');
console.log('测试结果总汇总');
console.log('============================================\n');

console.log('测试文件统计:');
for (const r of results) {
  const status = r.status === 'PASS' ? '✅' : '❌';
  console.log(`  ${status} ${r.name}: ${r.pass} 通过, ${r.fail} 失败`);
}

console.log('\n--------------------------------------------');
console.log(`总计: ✅ ${totalPass} 通过, ❌ ${totalFail} 失败`);
console.log(`覆盖率: ${((totalPass / (totalPass + totalFail)) * 100).toFixed(1)}%`);
console.log('============================================\n');

if (totalFail > 0) {
  console.log('⚠️  存在失败的测试，请检查上述输出');
  process.exit(1);
} else {
  console.log('🎉 所有测试通过！');
}
