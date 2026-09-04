param(
  [Parameter(Mandatory = $true)]
  [string]$PrefsPath,

  [Parameter(Mandatory = $true)]
  [string]$BackupPath
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $PrefsPath)) {
  throw "Zotero preference file not found: $PrefsPath"
}

$content = [System.IO.File]::ReadAllText($PrefsPath)
$pattern = '(?<prefix>\\"event\\":5,\\"operation\\":)1(?=,\\"data\\":)'
$matches = [regex]::Matches($content, $pattern)

if ($matches.Count -ne 1) {
  throw "Expected exactly one misconfigured AI Butler tag-sync rule; found $($matches.Count). No changes were made."
}

$backupDirectory = Split-Path -Parent $BackupPath
if (-not (Test-Path -LiteralPath $backupDirectory)) {
  New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
}

Copy-Item -LiteralPath $PrefsPath -Destination $BackupPath -Force
$updated = [regex]::Replace($content, $pattern, '${prefix}4', 1)
[System.IO.File]::WriteAllText($PrefsPath, $updated, [System.Text.UTF8Encoding]::new($false))

Write-Output 'Repaired Actions & Tags rule: operation add -> script.'
