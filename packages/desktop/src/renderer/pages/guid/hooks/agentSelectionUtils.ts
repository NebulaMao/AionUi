/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { configService } from '@/common/config/configService';
import type { AgentSource } from '@/renderer/utils/model/agentTypes';

/** Save preferred mode to the agent's own config key */
export async function savePreferredMode(agentKey: string, mode: string): Promise<void> {
  try {
    if (agentKey === 'aionrs') {
      const config = configService.get('aionrs.config');
      await configService.set('aionrs.config', { ...config, preferredMode: mode });
    } else if (agentKey !== 'custom') {
      const config = configService.get('acp.config');
      const backendConfig = config?.[agentKey as string] || {};
      await configService.set('acp.config', { ...config, [agentKey]: { ...backendConfig, preferredMode: mode } });
    }
  } catch {
    /* silent */
  }
}

/** Save preferred model ID to the agent's acp.config key */
export async function savePreferredModelId(agentKey: string, model_id: string): Promise<void> {
  try {
    const config = configService.get('acp.config');
    const backendConfig = config?.[agentKey as string] || {};
    await configService.set('acp.config', { ...config, [agentKey]: { ...backendConfig, preferredModelId: model_id } });
  } catch {
    /* silent */
  }
}

/**
 * Save (or clear) a user-specified CLI binary path for a detected ACP agent.
 *
 * Persisted under `acp.config[agentKey].cli_path`. An empty/whitespace value
 * clears the override so the backend falls back to `$PATH` auto-detection.
 * `aionrs` / `custom` are skipped — their launch contract does not carry a
 * frontend-supplied `cli_path` (see {@link getAgentCliPath}).
 */
export async function saveAgentCliPath(agentKey: string, cliPath: string | undefined): Promise<void> {
  try {
    if (agentKey === 'aionrs' || agentKey === 'custom') return;
    const config = configService.get('acp.config');
    const backendConfig = config?.[agentKey as string] || {};
    const trimmed = cliPath?.trim();
    await configService.set('acp.config', {
      ...config,
      [agentKey]: { ...backendConfig, cli_path: trimmed && trimmed.length > 0 ? trimmed : undefined },
    });
  } catch {
    /* silent */
  }
}

/**
 * Read the user-specified CLI binary path override for a detected agent, if any.
 *
 * Returns `undefined` for `aionrs` / `custom` (their create path does not
 * forward `cli_path`) and when no non-empty override is stored. Synchronous —
 * mirrors the other `acp.config` readers so it can run inside the agent-list
 * normalisation and conversation-create builders without awaiting.
 */
export function getAgentCliPath(agentKey: string): string | undefined {
  try {
    if (agentKey === 'aionrs' || agentKey === 'custom') return undefined;
    const config = configService.get('acp.config');
    const backendConfig = config?.[agentKey as string] as { cli_path?: string } | undefined;
    const cliPath = backendConfig?.cli_path;
    return typeof cliPath === 'string' && cliPath.trim().length > 0 ? cliPath.trim() : undefined;
  } catch {
    return undefined;
  }
}

/** Save default aionrs provider/model so the Guid page restores it next session. */
export async function saveAionrsDefaultModel(provider_id: string, use_model: string): Promise<void> {
  try {
    await configService.set('aionrs.defaultModel', { id: provider_id, use_model });
  } catch {
    /* silent */
  }
}

/**
 * Get agent key for selection.
 *
 * Rows that are row-scoped (custom ACP / remote agents) use `agent.id` directly
 * as the key — no namespace prefix. Builtin / internal agents keep `backend` or
 * `agent_type` as the key since there is only one row per type.
 *
 * Note: preset *assistants* (not agents) still use a `custom:<assistantId>`
 * form produced inline by `AssistantSelectionArea`. That is a separate
 * selection path that points at the backend-merged assistant catalog, not
 * `AgentRegistry`.
 */
export const getAgentKey = (agent: {
  agent_type: string;
  agent_source?: AgentSource;
  backend?: string;
  id?: string;
  is_preset?: boolean;
}): string => {
  const rowScoped = agent.agent_type === 'remote' || agent.agent_source === 'custom';
  if (rowScoped && agent.id) return agent.id;
  return agent.backend || agent.agent_type;
};
