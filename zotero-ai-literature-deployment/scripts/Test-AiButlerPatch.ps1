[CmdletBinding()]
param(
    [string]$ProfileDirectory,
    [string]$ExpectedVersion = '3.8.5.2'
)

$ErrorActionPreference = 'Stop'

function Get-ManifestEntry {
    param([Parameter(Mandatory)][string]$XpiPath)

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::OpenRead($XpiPath)
    try {
        $entry = $archive.GetEntry('manifest.json')
        if ($null -eq $entry) { throw "manifest.json is missing from $XpiPath" }
        $reader = [System.IO.StreamReader]::new($entry.Open())
        try { return $reader.ReadToEnd() | ConvertFrom-Json }
        finally { $reader.Dispose() }
    }
    finally { $archive.Dispose() }
}

function Test-ArchiveMarker {
    param(
        [Parameter(Mandatory)][string]$XpiPath,
        [Parameter(Mandatory)][string]$Marker
    )

    $archive = [System.IO.Compression.ZipFile]::OpenRead($XpiPath)
    try {
        $entry = $archive.GetEntry('content/scripts/aiButler.js')
        if ($null -eq $entry) { return $false }
        $reader = [System.IO.StreamReader]::new($entry.Open())
        try { return $reader.ReadToEnd().Contains($Marker) }
        finally { $reader.Dispose() }
    }
    finally { $archive.Dispose() }
}

if (-not $ProfileDirectory) {
    $profilesRoot = Join-Path $env:APPDATA 'Zotero\Zotero\Profiles'
    $profiles = @(Get-ChildItem -LiteralPath $profilesRoot -Directory | Sort-Object LastWriteTime -Descending)
    if ($profiles.Count -ne 1) {
        throw "Found $($profiles.Count) Zotero profiles. Re-run with -ProfileDirectory <profile path>."
    }
    $ProfileDirectory = $profiles[0].FullName
}

$liveXpi = Join-Path $ProfileDirectory 'extensions\zotero-ai-butler@github.com.xpi'
if (-not (Test-Path -LiteralPath $liveXpi -PathType Leaf)) {
    throw "AI Butler XPI was not found: $liveXpi"
}

$manifest = Get-ManifestEntry -XpiPath $liveXpi
$automaticUpdateEndpointDisabled = -not $manifest.applications.zotero.update_url
$markers = @(
    'workflowPreset',
    'collectionL1Summary',
    'handleCollectionL1Summary',
    'autoScanPromptName',
    'noteStrategy: "append"',
    'prompt: options?.prompt',
    'abortedTaskRecoveryCount',
    'Recovered aborted tasks from persisted queue'
)
$markerResults = foreach ($marker in $markers) {
    [pscustomobject]@{ Marker = $marker; Present = (Test-ArchiveMarker -XpiPath $liveXpi -Marker $marker) }
}

$result = [pscustomobject]@{
    ProfileDirectory = $ProfileDirectory
    XpiPath          = $liveXpi
    AddonId          = $manifest.applications.zotero.id
    Version          = $manifest.version
    ExpectedVersion  = $ExpectedVersion
    VersionMatches   = ($manifest.version -eq $ExpectedVersion)
    AutomaticUpdateEndpointDisabled = $automaticUpdateEndpointDisabled
    PatchMarkers     = $markerResults
    PatchIntact      = (($markerResults | Where-Object { -not $_.Present }).Count -eq 0)
}

$result | Format-List

if (-not $result.VersionMatches -or -not $result.PatchIntact -or -not $result.AutomaticUpdateEndpointDisabled) {
    Write-Error 'AI Butler has been updated or the local workflow patch is incomplete. Do not overwrite the XPI while Zotero is running; follow UPGRADE_GUARD.md.'
    exit 1
}
