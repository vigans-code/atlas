param(
  [ValidateRange(3, 30)]
  [int]$TimeoutSeconds = 15
)

$ErrorActionPreference = "Stop"

try {
  Add-Type -AssemblyName System.Speech
  $recognizerInfo = [System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers() |
    Where-Object { $_.Culture.Name -eq "en-US" } |
    Select-Object -First 1
  if (-not $recognizerInfo) {
    throw "The English Windows speech recognizer is not installed."
  }

  $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine($recognizerInfo)
  try {
    $recognizer.LoadGrammar((New-Object System.Speech.Recognition.DictationGrammar))
    $recognizer.SetInputToDefaultAudioDevice()
    $result = $recognizer.Recognize([TimeSpan]::FromSeconds($TimeoutSeconds))
    if (-not $result -or [string]::IsNullOrWhiteSpace($result.Text)) {
      throw "No speech was detected. Check the microphone and try again."
    }
    @{ ok = $true; text = $result.Text; confidence = $result.Confidence } | ConvertTo-Json -Compress
  }
  finally {
    $recognizer.Dispose()
  }
}
catch {
  @{ ok = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress
}
