# Запускает всё для разработки на эмуляторе: эмулятор, сервер Metro и приложение.
# Повторный запуск безопасен: то, что уже работает, пропускается.
#
#   npm run dev:emulator
#   npm run dev:emulator -- -EmulatorName Pixel_7_API_34

param(
  # Если имя не указано, берётся первый эмулятор, созданный в Android Studio.
  [string]$EmulatorName = ''
)

$projectFolder = Split-Path -Parent $PSScriptRoot
$androidSdkFolder = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
if ($env:ANDROID_HOME) { $androidSdkFolder = $env:ANDROID_HOME }
$emulatorPath = Join-Path $androidSdkFolder 'emulator\emulator.exe'
$adbPath = Join-Path $androidSdkFolder 'platform-tools\adb.exe'

# Суффикс .dev у пакета означает сборку для разработки: она ставится рядом с релизной.
$appPackage = 'io.github.hamelonov.gymtracker.dev'
$metroPort = 8081
$emulatorBootTimeoutSeconds = 240
$metroStartTimeoutSeconds = 90

function Write-Step([string]$message) {
  Write-Host "==> $message" -ForegroundColor Cyan
}

function Stop-WithError([string]$message) {
  Write-Host "Ошибка: $message" -ForegroundColor Red
  exit 1
}

# Берём только эмулятор, а не любое устройство: подключённый по USB телефон не должен сбивать adb.
function Get-EmulatorSerial {
  $deviceLines = & $adbPath devices 2>$null
  foreach ($line in $deviceLines) {
    if ($line -match '^(emulator-\d+)\s+device$') { return $Matches[1] }
  }
  return $null
}

# Пока эмулятор грузится, adb его ещё не видит. Без этой проверки повторный запуск открыл бы второй эмулятор.
function Test-EmulatorProcessRunning {
  $processes = Get-Process -Name 'qemu-system-*' -ErrorAction SilentlyContinue
  return @($processes).Count -gt 0
}

function Resolve-EmulatorName {
  if ($EmulatorName) { return $EmulatorName }

  $availableNames = @(& $emulatorPath -list-avds 2>$null | Where-Object { $_ -match '^[\w.\-]+$' })
  if ($availableNames.Count -eq 0) {
    Stop-WithError 'Не найдено ни одного эмулятора. Создайте его в Android Studio: Device Manager.'
  }
  return $availableNames[0]
}

function Start-Emulator {
  $name = Resolve-EmulatorName
  Write-Step "Запускаю эмулятор $name"
  Start-Process -FilePath $emulatorPath -ArgumentList '-avd', $name -WindowStyle Hidden
}

function Wait-ForEmulatorBoot {
  Write-Step 'Жду, пока эмулятор загрузится'
  $deadline = (Get-Date).AddSeconds($emulatorBootTimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $serial = Get-EmulatorSerial
    if ($serial) {
      $bootFlag = & $adbPath -s $serial shell getprop sys.boot_completed 2>$null
      if ("$bootFlag".Trim() -eq '1') { return $serial }
    }
    Start-Sleep -Seconds 3
  }
  Stop-WithError "Эмулятор не загрузился за $emulatorBootTimeoutSeconds секунд."
}

function Test-MetroRunning {
  try {
    $response = Invoke-WebRequest -Uri "http://localhost:$metroPort/status" -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

# Metro живёт в отдельном окне: в нём видны логи приложения, а закрытие окна останавливает сервер.
function Start-Metro {
  Write-Step 'Запускаю Metro в новом окне'
  $windowCommand = "`$Host.UI.RawUI.WindowTitle = 'GymTracker Metro'; Set-Location '$projectFolder'; npx expo start --dev-client --port $metroPort"
  # Обход политики запуска скриптов нужен, потому что npx в PowerShell это скрипт .ps1.
  Start-Process -FilePath 'powershell' -ArgumentList '-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', "`"$windowCommand`""
}

function Wait-ForMetro {
  $deadline = (Get-Date).AddSeconds($metroStartTimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-MetroRunning) { return }
    Start-Sleep -Seconds 2
  }
  Stop-WithError "Metro не ответил за $metroStartTimeoutSeconds секунд. Посмотрите его окно."
}

function Test-AppInstalled([string]$serial) {
  $packageLines = & $adbPath -s $serial shell pm list packages $appPackage 2>$null
  return "$packageLines" -match [regex]::Escape("package:$appPackage")
}

function Start-App([string]$serial) {
  if (-not (Test-AppInstalled $serial)) {
    Stop-WithError ("Приложение $appPackage не установлено на эмуляторе. Соберите dev-сборку:`n" +
      "  npx expo prebuild --platform android --no-install`n" +
      "  npx expo run:android --no-bundler`n" +
      'Перед сборкой убедитесь, что переменная APP_UPDATE_CHANNEL не задана.')
  }
  Write-Step 'Открываю приложение'
  & $adbPath -s $serial shell monkey -p $appPackage -c android.intent.category.LAUNCHER 1 2>$null | Out-Null
}

# Сборка для разработки ходит на канал preview, поэтому релизную переменную из этого окна убираем.
Remove-Item Env:APP_UPDATE_CHANNEL -ErrorAction SilentlyContinue
$env:ANDROID_HOME = $androidSdkFolder
$env:Path = "$androidSdkFolder\platform-tools;$env:Path"

if (-not (Test-Path $emulatorPath)) {
  Stop-WithError "Не найден эмулятор по пути $emulatorPath. Установите Android SDK или задайте ANDROID_HOME."
}

# Сервер adb запускаем заранее, иначе первая команда выведет служебные сообщения вместо ответа.
& $adbPath start-server 2>$null | Out-Null

$isEmulatorAlreadyStarted = (Get-EmulatorSerial) -or (Test-EmulatorProcessRunning)
if ($isEmulatorAlreadyStarted) {
  Write-Step 'Эмулятор уже запущен'
} else {
  Start-Emulator
}
$emulatorSerial = Wait-ForEmulatorBoot

# Без проброса порта приложение в эмуляторе не достанет до Metro на компьютере.
Write-Step 'Пробрасываю порт Metro на эмулятор'
& $adbPath -s $emulatorSerial reverse "tcp:$metroPort" "tcp:$metroPort" 2>$null | Out-Null

if (Test-MetroRunning) {
  Write-Step 'Metro уже запущен'
} else {
  Start-Metro
  Wait-ForMetro
}

Start-App $emulatorSerial
Write-Host 'Готово. Чтобы остановить Metro, закройте его окно.' -ForegroundColor Green
