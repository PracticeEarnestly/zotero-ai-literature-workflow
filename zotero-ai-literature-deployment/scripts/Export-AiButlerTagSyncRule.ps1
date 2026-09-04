<#
.SYNOPSIS
Exports the current AI Butler structured-tag JavaScript from an old Zotero profile.

.DESCRIPTION
The exported .js file contains only the Actions & Tags rule script. It does not
contain Zotero login credentials, API keys, cookies, or the Zotero database.
Run this on the old computer, then copy the resulting .js file to the new one.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$PrefsPath,

    [Parameter(Mandatory)]
    [string]$OutputPath
)

if (-not (Test-Path -LiteralPath $PrefsPath -PathType Leaf)) {
    throw "Zotero preferences file was not found: $PrefsPath"
}

$candidateRules = @()
Get-Content -LiteralPath $PrefsPath | ForEach-Object {
    if ($_ -notmatch '^user_pref\("(?<key>extensions\.actionsTags\.rules\.[^"]+)",\s*(?<value>.+)\);$') {
        return
    }

    try {
        $storedRuleJson = ConvertFrom-Json $Matches.value -ErrorAction Stop
        $rule = ConvertFrom-Json $storedRuleJson -ErrorAction Stop
        if ($rule.event -eq 5 -and $rule.operation -eq 4 -and
            $rule.data -like '*AI Butler -> Zotero Structured Tag Sync*') {
            $candidateRules += $rule
        }
    }
    catch {
        # Ignore unrelated or malformed third-party rules.
    }
}

if ($candidateRules.Count -ne 1) {
    throw "Expected one AI Butler tag-sync rule, but found $($candidateRules.Count). Open Actions & Tags on the old computer and verify that the structured-tag rule exists."
}

$targetDirectory = Split-Path -Parent $OutputPath
if ($targetDirectory -and -not (Test-Path -LiteralPath $targetDirectory -PathType Container)) {
    New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null
}

[System.IO.File]::WriteAllText($OutputPath, $candidateRules[0].data, [System.Text.UTF8Encoding]::new($false))
Write-Host "Exported the AI Butler structured-tag rule to: $OutputPath"
