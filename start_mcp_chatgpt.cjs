const { spawn } = require('child_process');

console.log('🚀 Инициализация Единого Shell MCP-туннеля для ChatGPT...');

if (process.env.ENABLE_PUBLIC_SHELL_MCP !== '1') {
  console.error('Остановлено: публичный Shell MCP отключен по умолчанию.');
  console.error('Если вы точно понимаете риск, запустите с ENABLE_PUBLIC_SHELL_MCP=1.');
  process.exit(1);
}

const BASH_PORT = 8001;

// Вспомогательная функция для запуска процесса
function runProcess(name, command, args, env = {}) {
  const child = spawn(command, args, {
    shell: true,
    env: { ...process.env, ...env }
  });

  child.stdout.on('data', (data) => {
    console.log(`[${name} STDOUT]: ${data.toString().trim()}`);
  });

  child.stderr.on('data', (data) => {
    console.error(`[${name} STDERR]: ${data.toString().trim()}`);
  });

  child.on('error', (err) => {
    console.error(`[${name} ERROR]:`, err);
  });

  return child;
}

// Вспомогательная функция для запуска tunnelmole и захвата URL
function startTunnel(name, port, callback) {
  const tm = spawn('npx', ['-y', 'tunnelmole', port], { shell: true });
  let urlFound = false;

  tm.stdout.on('data', (data) => {
    const text = data.toString();
    const match = text.match(/(https:\/\/[^\s]+\.tunnelmole\.net)/i);
    if (match && !urlFound) {
      urlFound = true;
      callback(match[1]);
    }
  });

  tm.stderr.on('data', (data) => {
    // console.error(`[${name} Tunnel STDERR]: ${data.toString().trim()}`);
  });

  return tm;
}

console.log('⏳ Запуск сервера Supergateway (Bash MCP)...');

// Запуск Bash Supergateway с включенным CORS
const bashGateway = runProcess(
  'Bash-Gateway',
  'npx',
  ['-y', 'supergateway', '--port', BASH_PORT, '--cors', '--stdio', '"npx -y bash-mcp"']
);

let bashUrl = null;

function printFinalInstructions() {
  if (bashUrl) {
    console.log('\n================================================================');
    console.log('🎉 ЕДИНЫЙ SHELL MCP СЕРВЕР УСПЕШНО ЗАПУЩЕН И ГОТОВ К РАБОТЕ!');
    console.log('================================================================\n');
    console.log('👉 ПОДКЛЮЧЕНИЕ К CHATGPT ИЛИ QWEN CODER:\n');
    console.log('1️⃣ Включите Developer Mode в ChatGPT:');
    console.log('   Перейдите в Settings -> Apps -> Advanced Settings -> Developer Mode -> ON\n');
    console.log('2️⃣ Добавьте ЕДИНЫЙ коннектор Shell MCP:');
    console.log('   - Нажмите "Add Custom Connector" или "Create"');
    console.log('   - Название: Shell MCP');
    console.log(`   - SSE URL: ${bashUrl}/sse`);
    console.log('   - Выберите: No Authentication только если туннель временный и контролируемый.\n');
    console.log('================================================================');
    console.log('💪 ПОЧЕМУ ЭТО РЕШЕНИЕ НАМНОГО КРУЧЕ И НАДЕЖНЕЕ:\n');
    console.log('   1. ВСЕ В ОДНОМ: ChatGPT получает доступ к терминалу вашего Mac.');
    console.log('   2. УПРАВЛЕНИЕ GIT: ChatGPT может делать коммиты и пушить прямо через git-команды.');
    console.log('   3. ПРЯМОЙ SSH НА VPS: За счет настроенного алиаса "mercasto" в SSH-конфиге вашего Mac,');
    console.log('      ChatGPT может выполнять команды через ваш локальный SSH alias:');
    console.log('      ssh mercasto "команда" (например, ssh mercasto "docker ps" или "df -h")');
    console.log('   4. НЕТ КОНФЛИКТОВ: Используется только ОДИН легкий туннель без лимитов и блокировок.');
    console.log('----------------------------------------------------------------');
    console.log('ℹ️ Держите этот скрипт запущенным во время работы в браузере.');
    console.log('Для остановки сервера и закрытия туннеля нажмите Ctrl+C.');
    console.log('================================================================\n');
  }
}

console.log('⏳ Создание безопасного публичного туннеля через Tunnelmole...');

const bashTunnel = startTunnel('Bash-Tunnel', BASH_PORT, (url) => {
  bashUrl = url;
  console.log(`🔗 Shell Tunnel создан: ${url}`);
  printFinalInstructions();
});

// Корректное завершение при Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Останавливаем сервера и закрываем туннели...');
  bashGateway.kill();
  bashTunnel.kill();
  process.exit(0);
});
