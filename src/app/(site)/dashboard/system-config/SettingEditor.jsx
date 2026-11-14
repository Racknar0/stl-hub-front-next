import React, { useState } from 'react';
import TuneOutlined from '@mui/icons-material/TuneOutlined';
import ExpandMore from '@mui/icons-material/ExpandMore';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';
import { ConfigHelp, configLabel, configDescription } from './configSections';

export default function SettingEditor({ setting, value, description, onValueChange, onDescriptionChange, onSave, saving }) {
  const [revealed, setRevealed] = useState(false);
  const sensitive = /TOKEN|PASSWORD|SECRET|CREDENTIAL/i.test(setting.key) && !/EXPIRES/i.test(setting.key);
  const json = /^[\s]*[\[{]/.test(value || '');
  const id = `config-${setting.key}`;
  return <details className="setting-card setting-editor">
    <summary className="setting-summary">
      <TuneOutlined aria-hidden="true" />
      <span><strong>{configLabel(setting.key)}</strong><code>{setting.key}</code></span>
      <ExpandMore className="setting-chevron" aria-hidden="true" />
    </summary>
    <div className="setting-body">
      <ConfigHelp>{configDescription(setting.key, description)}</ConfigHelp>
      <div className="form-group">
        <label htmlFor={id}>{json ? 'Configuración JSON' : sensitive ? 'Credencial' : 'Valor'}</label>
        {json && !sensitive ? <textarea id={id} rows={6} className="config-code" value={value || ''} onChange={event => onValueChange(event.target.value)} spellCheck={false} /> :
          <div className="config-secret-field"><input id={id} type={sensitive && !revealed ? 'password' : 'text'} value={value || ''} autoComplete="off" onChange={event => onValueChange(event.target.value)} />
            {sensitive && <button type="button" aria-label={revealed ? 'Ocultar credencial' : 'Mostrar credencial'} onClick={() => setRevealed(current => !current)}>{revealed ? <VisibilityOffOutlined /> : <VisibilityOutlined />}</button>}
          </div>}
      </div>
      <details className="config-help"><summary>Descripción del ajuste</summary><label className="visually-hidden" htmlFor={`${id}-description`}>Descripción</label><textarea id={`${id}-description`} rows={2} value={description || ''} onChange={event => onDescriptionChange(event.target.value)} /></details>
    </div>
    <div className="setting-footer"><button type="button" className="btn btn-primary" disabled={saving} onClick={onSave}>{saving ? 'Guardando...' : 'Guardar ajuste'}</button></div>
  </details>;
}
