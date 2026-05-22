const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Инициализация MCP-туннелей для ChatGPT...');

// 1. Автоматический поиск токена GitHub
let githubToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const configPaths = [
  '/Users/ivan/.gemini/antigravity/mcp_config.json',
  path.join(process.env.HOME, '.cursor/mcp.json'),
  path.join(process.env.HOME, 'Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json'),
  path.join(process.env.HOME, 'Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json'),
  path.join(process.env.HOME, '.lmstudio/mcp.json')
];

for (const configPath of configPaths) {
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.mcpServers && config.mcpServers.github && config.mcpServers.github.env && config.mcpServers.github.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
        githubToken = config.mcpServers.github.env.GITHUB_PERSONAL_ACCESS_TOKEN;
        console.log(`✅ Найдена конфигурация GitHub в: ${configPath}`);
        break;
      }
    } catch (e) {
      // Игнорируем ошибки парсинга
    }
  }
}

if (!githubToken) {
  console.error('❌ Ошибка: Не удалось найти GITHUB_PERSONAL_ACCESS_TOKEN в конфигурационных файлах.');
  console.log('Пожалуйста, укажите токен в переменной окружения или проверьте настройки.');
  process.exit(1);
}

const GITHUB_PORT = 8000;
const BASH_PORT = 8001;

// Вспомогательная функция для запуска процесса
function runProcess(name, command, args, env = {}) {
  const child = spawn(command, args, {
    shell: true,
    env: { ...process.env, ...env }
  });

  child.stdout.on('data', (data) => {
    // console.log(`[${name} STDOUT]: ${data.toString().trim()}`);
  });

  child.stderr.on('data', (data) => {
    // console.error(`[${name} STDERR]: ${data.toString().trim()}`);
  });

  child.on('error', (err) => {
    console.error(`[${name} ERROR]:`, err);
  });

  return child;
}

// Вспомогательная функция для запуска localtunnel и захвата URL
function startTunnel(name, port, callback) {
  const lt = spawn('npx', ['-y', 'localtunnel', '--port', port], { shell: true });
  let urlFound = false;

  lt.stdout.on('data', (data) => {
    const text = data.toString();
    const match = text.match(/your url is:\s*(https:\/\/[^\s]+)/i);
    if (match && !urlFound) {
      urlFound = true;
      callback(match[1]);
    }
  });

  lt.stderr.on('data', (data) => {
    // console.error(`[${name} Tunnel STDERR]: ${data.toString().trim()}`);
  });

  return lt;
}

console.log('⏳ Запуск серверов Supergateway...');

// 2. Запуск GitHub Supergateway
const githubGateway = runProcess(
  'GitHub-Gateway',
  'npx',
  ['-y', 'supergateway', '--port', GITHUB_PORT, '--stdio', '"npx -y @modelcontextprotocol/server-github"'],
  { GITHUB_PERSONAL_ACCESS_TOKEN: githubToken }
);

// 3. Запуск Bash Supergateway
const bashGateway = runProcess(
  'Bash-Gateway',
  'npx',
  ['-y', 'supergateway', '--port', BASH_PORT, '--stdio', '"npx -y bash-mcp"']
);

let githubUrl = null;
let bashUrl = null;

function printFinalInstructions() {
  if (githubUrl && bashUrl) {
    console.log('\n================================================================');
    console.log('🎉 MCP СЕРВЕРЫ УСПЕШНО ЗАПУЩЕНЫ И ТУННЕЛИРОВАНЫ НА ВЕСЬ МИР!');
    console.log('================================================================\n');
    console.log('👉 ПОДКЛЮЧЕНИЕ К CHATGPT (И ЛЮБЫМ ДРУГИМ ВНЕШНИМ КЛИЕНТАМ):\n');
    console.log('1️⃣ Включите Developer Mode в ChatGPT:');
    console.log('   Перейдите в Settings -> Apps -> Advanced Settings -> Developer Mode -> ON\n');
    console.log('2️⃣ Добавьте коннектор для GitHub:');
    console.log('   - Нажмите "Add Custom Connector" или "Create"');
    console.log('   - Название: GitHub MCP');
    console.log(`   - SSE URL: ${githubUrl}/sse`);
    console.log('   - Выберите: No Authentication\n');
    console.log('3️⃣ Добавьте коннектор для Bash (Server Shell):');
    console.log('   - Нажмите "Add Custom Connector" или "Create"');
    console.log('   - Название: Shell MCP');
    console.log(`   - SSE URL: ${bashUrl}/sse`);
    console.log('   - Выберите: No Authentication\n');
    console.log('----------------------------------------------------------------');
    console.log('ℹ️ Держите этот скрипт запущенным во время работы в ChatGPT.');
    console.log('Для остановки серверов и закрытия туннелей нажмите Ctrl+C.');
    console.log('================================================================\n');
  }
}

console.log('⏳ Создание безопасных публичных туннелей через localtunnel...');

const githubTunnel = startTunnel('GitHub-Tunnel', GITHUB_PORT, (url) => {
  githubUrl = url;
  console.log(`🔗 GitHub Tunnel создан: ${url}`);
  printFinalInstructions();
});

const bashTunnel = startTunnel('Bash-Tunnel', BASH_PORT, (url) => {
  bashUrl = url;
  console.log(`🔗 Bash Tunnel создан: ${url}`);
  printFinalInstructions();
});

// Корректное завершение при Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Останавливаем серверы и закрываем туннели...');
  githubGateway.kill();
  bashGateway.kill();
  githubTunnel.kill();
  bashTunnel.kill();
  process.exit(0);
});
