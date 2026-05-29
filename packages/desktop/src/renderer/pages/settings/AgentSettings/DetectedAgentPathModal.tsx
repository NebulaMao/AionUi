/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AgentMetadata } from '@/renderer/utils/model/agentTypes';
import { ipcBridge } from '@/common';
import { acpConversation } from '@/common/adapter/ipcBridge';
import AionModal from '@/renderer/components/base/AionModal';
import { getAgentCliPath, saveAgentCliPath } from '@/renderer/pages/guid/hooks/agentSelectionUtils';
import { Alert, Button, Input, Typography } from '@arco-design/web-react';
import { CheckOne, CloseOne, FolderOpen } from '@icon-park/react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type TestStatus = 'idle' | 'testing' | 'success' | 'fail_cli' | 'fail_acp';

interface DetectedAgentPathModalProps {
  /** Detected agent being configured. `null` keeps the modal closed. */
  agent: AgentMetadata | null;
  onClose: () => void;
  /** Called after a successful save so the parent can revalidate the list. */
  onSaved: () => void | Promise<void>;
}

/** Flatten the backend `env` array form into the `{KEY: value}` record the
 *  try-connect endpoint expects, so the test launches with the same
 *  environment the agent would normally run with. */
function envEntriesToRecord(entries: AgentMetadata['env'] | undefined): Record<string, string> | undefined {
  if (!entries || entries.length === 0) return undefined;
  const out: Record<string, string> = {};
  for (const e of entries) {
    if (e.name) out[e.name] = e.value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Lets the user point a detected ACP agent at an explicit CLI binary instead
 * of relying on `$PATH` auto-detection. The path is persisted under
 * `acp.config[backend].cli_path` and forwarded as `extra.cli_path` at
 * conversation-create time. An empty value clears the override.
 */
const DetectedAgentPathModal: React.FC<DetectedAgentPathModalProps> = ({ agent, onClose, onSaved }) => {
  const { t } = useTranslation();
  const [path, setPath] = useState('');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [saving, setSaving] = useState(false);

  const backendKey = agent ? agent.backend || agent.agent_type : '';

  useEffect(() => {
    setTestStatus('idle');
    setSaving(false);
    setPath(agent ? (getAgentCliPath(backendKey) ?? '') : '');
  }, [agent, backendKey]);

  const handlePathChange = (value: string) => {
    setPath(value);
    setTestStatus('idle');
  };

  const handleBrowse = async () => {
    try {
      const files = await ipcBridge.dialog.showOpen.invoke({ properties: ['openFile'] });
      if (files && files.length > 0 && files[0]) {
        handlePathChange(files[0]);
      }
    } catch {
      /* user cancelled or dialog unavailable */
    }
  };

  const handleTest = async () => {
    const command = path.trim();
    if (!command) return;
    setTestStatus('testing');
    try {
      const result = await acpConversation.testCustomAgent.invoke({
        command,
        acp_args: agent?.args && agent.args.length > 0 ? agent.args : undefined,
        env: envEntriesToRecord(agent?.env),
      });
      setTestStatus(result.step === 'success' ? 'success' : result.step === 'fail_acp' ? 'fail_acp' : 'fail_cli');
    } catch {
      setTestStatus('fail_cli');
    }
  };

  const handleSave = async () => {
    if (!agent) return;
    setSaving(true);
    try {
      await saveAgentCliPath(backendKey, path);
      await onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const labelClassName = 'mb-6px block text-13px font-medium text-t-primary';
  const helpClassName = 'mt-4px block text-12px leading-18px text-t-tertiary';

  return (
    <AionModal
      visible={Boolean(agent)}
      onCancel={onClose}
      header={{
        title: agent ? t('settings.agentManagement.cliPathTitle', { name: agent.name }) : '',
        showClose: true,
      }}
      footer={null}
      style={{ maxWidth: '92vw', width: 460, borderRadius: 16 }}
      contentStyle={{
        background: 'var(--dialog-fill-0)',
        borderRadius: 16,
        padding: '20px 24px 16px',
        overflow: 'auto',
      }}
    >
      <div className='flex flex-col gap-16px pt-8px pb-4px'>
        <div>
          <Typography.Text className={labelClassName}>{t('settings.agentManagement.cliPathLabel')}</Typography.Text>
          <div className='flex items-center gap-8px'>
            <Input
              size='large'
              value={path}
              onChange={handlePathChange}
              placeholder={t('settings.agentManagement.cliPathPlaceholder')}
            />
            <Button
              size='large'
              icon={<FolderOpen theme='outline' size={16} />}
              onClick={() => void handleBrowse()}
              className='!rounded-10px shrink-0'
            >
              {t('common.browse')}
            </Button>
          </div>
          <Typography.Text type='secondary' className={helpClassName}>
            {t('settings.agentManagement.cliPathHelp')}
          </Typography.Text>
        </div>

        <div>
          <Button
            long
            type='outline'
            disabled={!path.trim() || testStatus === 'testing'}
            loading={testStatus === 'testing'}
            onClick={() => void handleTest()}
            className='!rounded-10px'
          >
            {testStatus === 'testing' ? t('settings.testConnectionTesting') : t('settings.testConnectionBtn')}
          </Button>
          {testStatus === 'success' && (
            <Alert
              className='mt-10px'
              type='success'
              icon={<CheckOne theme='filled' size={16} />}
              content={t('settings.testConnectionSuccess')}
            />
          )}
          {testStatus === 'fail_cli' && (
            <Alert
              className='mt-10px'
              type='error'
              icon={<CloseOne theme='filled' size={16} />}
              content={t('settings.testConnectionFailCli')}
            />
          )}
          {testStatus === 'fail_acp' && (
            <Alert
              className='mt-10px'
              type='warning'
              icon={<CloseOne theme='filled' size={16} />}
              content={t('settings.testConnectionFailAcp')}
            />
          )}
        </div>

        <div className='flex justify-end gap-10px pt-4px'>
          <Button className='!rounded-10px !px-20px' onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type='primary'
            loading={saving}
            onClick={() => void handleSave()}
            className='!rounded-10px !px-20px'
          >
            {t('common.save')}
          </Button>
        </div>
      </div>
    </AionModal>
  );
};

export default DetectedAgentPathModal;
