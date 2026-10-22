[CmdletBinding()]
param(
    [string]$ProfileDirectory,
    [string]$ExpectedVersion = '5.1.0.3',
    [string]$ExpectedUpdateUrl = 'https://github.com/PracticeEarnestly/zotero-ai-literature-workflow/releases/download/release/update.json'
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
$updateEndpointControlled = ($manifest.applications.zotero.update_url -eq $ExpectedUpdateUrl)
$markers = @(
    'zotero-itemmenu-ai-butler-workflow-preset',
    'zotero-collectionmenu-ai-butler-workflow-preset',
    'zotero-collectionmenu-ai-butler-workflow-l1',
    'zotero-collectionmenu-ai-butler-workflow-l2',
    'zotero-collectionmenu-ai-butler-workflow-l3',
    'zotero-collectionmenu-ai-butler-workflow-repair',
    'handleCollectionWorkflowLevel',
    'handleCollectionRatedWorkflowRepair',
    'handleSelectedWorkflowLevel',
    'enqueueRatedWorkflow(item)',
    'enqueueWorkflowLevel',
    'noteStrategy: "append"',
    'getWorkflowEndpointId',
    'getWorkflowPrompt',
    'getCompletedL1State',
    'getWorkflowLevelState',
    'applyWorkflowTags',
    'AI_BUTLER_L1_DATA_AVAILABILITY_V1',
    'AI_BUTLER_FINAL_OUTPUT_ONLY_V1',
    'note-without-tag',
    'duplicate-item-artifact',
    'workflow-confirm-collection-level-title',
    'coordinator-qwen',
    'ratingWorkflowEnabled',
    'MinerU'
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
    UpdateUrl        = $manifest.applications.zotero.update_url
    ExpectedUpdateUrl = $ExpectedUpdateUrl
    UpdateEndpointControlled = $updateEndpointControlled
    PatchMarkers     = $markerResults
    PatchIntact      = (($markerResults | Where-Object { -not $_.Present }).Count -eq 0)
}

$result | Format-List

if (-not $result.VersionMatches -or -not $result.PatchIntact -or -not $result.UpdateEndpointControlled) {
    Write-Error 'AI Butler has been updated or the local workflow patch is incomplete. Do not overwrite the XPI while Zotero is running; follow UPGRADE_GUARD.md.'
    exit 1
}
