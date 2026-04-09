import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Clock, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { chatbotAPI } from '../../services/api';

const DEFAULT_FOLLOW_UP_CONFIG = {
  enabled: false,
  rules: [],
};

const DEFAULT_RULE = {
  name: '',
  conditionType: 'inactive_conversation',
  pipelineId: '',
  pipelineName: '',
  stageId: '',
  stageName: '',
  daysThreshold: 3,
  actions: [],
};

const DEFAULT_ACTION = {
  type: 'send_message',
  messageTemplate: '',
  targetStageId: '',
  targetStageName: '',
  tags: [],
  slackMessage: '',
};

const ACTION_LABELS = {
  send_message: 'Send Message',
  move_stage: 'Move Stage',
  add_tag: 'Add Tag',
  notify_slack: 'Notify Slack',
};

export default function ChatbotEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chatbot, setChatbot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    n8nWebhookUrl: '',
    ghlLocationId: '',
    ghlApiKey: '',
    active: true,
    slackWebhookUrl: '',
  });
  const [followUpRulesConfig, setFollowUpRulesConfig] = useState(DEFAULT_FOLLOW_UP_CONFIG);
  const [followUpExpanded, setFollowUpExpanded] = useState(false);
  const [expandedRules, setExpandedRules] = useState({});
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  // GHL pipeline/stage data (user inputs them manually for now)
  // In future: fetch from GHL API

  const loadChatbot = async () => {
    try {
      const { data } = await chatbotAPI.get(id);
      setChatbot(data);
      let config = {};
      try { config = data.config ? JSON.parse(data.config) : {}; } catch { /* ignore */ }

      setForm({
        name: data.name || '',
        n8nWebhookUrl: data.n8nWebhookUrl || '',
        ghlLocationId: data.ghlLocationId || '',
        ghlApiKey: '', // Don't pre-fill encrypted key
        active: data.active !== false,
        slackWebhookUrl: config.slackWebhookUrl || '',
      });
      setFollowUpRulesConfig(config.followUpRulesConfig || DEFAULT_FOLLOW_UP_CONFIG);
    } catch (err) {
      console.error('Failed to load chatbot:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const { data } = await chatbotAPI.getFollowUpLogs(id);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load follow-up logs:', err);
    }
  };

  useEffect(() => { loadChatbot(); }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const configObj = {};
      try {
        const existing = chatbot?.config ? JSON.parse(chatbot.config) : {};
        Object.assign(configObj, existing);
      } catch { /* ignore */ }
      configObj.followUpRulesConfig = followUpRulesConfig;
      configObj.slackWebhookUrl = form.slackWebhookUrl || undefined;

      const payload = {
        name: form.name,
        n8nWebhookUrl: form.n8nWebhookUrl,
        ghlLocationId: form.ghlLocationId,
        active: form.active,
        config: JSON.stringify(configObj),
      };
      // Only send ghlApiKey if user entered a new one
      if (form.ghlApiKey) payload.ghlApiKey = form.ghlApiKey;

      const { data } = await chatbotAPI.update(id, payload);
      setChatbot(data);
    } catch (err) {
      console.error('Failed to save chatbot:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Follow-up rule helpers ────────────────────────────────

  const updateRule = (index, field, value) => {
    setFollowUpRulesConfig(prev => {
      const rules = [...prev.rules];
      rules[index] = { ...rules[index], [field]: value };
      // Clear pipeline/stage when switching to inactive_conversation
      if (field === 'conditionType' && value === 'inactive_conversation') {
        rules[index].pipelineId = '';
        rules[index].pipelineName = '';
        rules[index].stageId = '';
        rules[index].stageName = '';
      }
      return { ...prev, rules };
    });
  };

  const addRule = () => {
    setFollowUpRulesConfig(prev => ({
      ...prev,
      rules: [...prev.rules, { ...DEFAULT_RULE, name: `Rule ${prev.rules.length + 1}` }],
    }));
  };

  const removeRule = (index) => {
    setFollowUpRulesConfig(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
  };

  const addAction = (ruleIndex) => {
    setFollowUpRulesConfig(prev => {
      const rules = [...prev.rules];
      rules[ruleIndex] = {
        ...rules[ruleIndex],
        actions: [...(rules[ruleIndex].actions || []), { ...DEFAULT_ACTION }],
      };
      return { ...prev, rules };
    });
  };

  const removeAction = (ruleIndex, actionIndex) => {
    setFollowUpRulesConfig(prev => {
      const rules = [...prev.rules];
      rules[ruleIndex] = {
        ...rules[ruleIndex],
        actions: rules[ruleIndex].actions.filter((_, i) => i !== actionIndex),
      };
      return { ...prev, rules };
    });
  };

  const updateAction = (ruleIndex, actionIndex, field, value) => {
    setFollowUpRulesConfig(prev => {
      const rules = [...prev.rules];
      const actions = [...rules[ruleIndex].actions];
      actions[actionIndex] = { ...actions[actionIndex], [field]: value };
      rules[ruleIndex] = { ...rules[ruleIndex], actions };
      return { ...prev, rules };
    });
  };

  const toggleRuleExpanded = (index) => {
    setExpandedRules(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // ── Render ────────────────────────────────────────────────

  if (loading) return <div style={{ color: '#64748b' }}>Loading chatbot...</div>;
  if (!chatbot) return <div style={{ color: '#f87171' }}>Chatbot not found</div>;

  const ruleCount = followUpRulesConfig.rules?.length || 0;

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-7">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/chatbots')}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#94a3b8' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-[22px] font-extrabold text-white">{chatbot.name || 'Chatbot'}</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50"
          style={{ background: '#E8792F' }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#d06a28'; }}
          onMouseLeave={e => e.currentTarget.style.background = '#E8792F'}
        >
          {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Save size={15} />}
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left column - Basic settings */}
        <div className="space-y-5">
          {/* Name & Active */}
          <div className="glass rounded-xl p-5" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748b' }}>
              Chatbot Name
            </label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg text-white mb-4"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
            />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                className="rounded"
                style={{ accentColor: '#E8792F' }}
              />
              <span style={{ color: '#94a3b8' }}>Active</span>
            </label>
          </div>

          {/* Webhook URL */}
          <div className="glass rounded-xl p-5" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748b' }}>
              n8n Webhook URL
            </label>
            <input
              value={form.n8nWebhookUrl}
              onChange={e => setForm(f => ({ ...f, n8nWebhookUrl: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg text-white font-mono"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
              placeholder="https://n8n.example.com/webhook/..."
            />
            <p className="text-[11px] mt-1.5" style={{ color: '#475569' }}>
              Used for sending follow-up messages via n8n workflow.
            </p>
          </div>

          {/* GHL Settings */}
          <div className="glass rounded-xl p-5" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#64748b' }}>
              GoHighLevel Settings
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#475569' }}>
                  Location ID
                </label>
                <input
                  value={form.ghlLocationId}
                  onChange={e => setForm(f => ({ ...f, ghlLocationId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg text-white font-mono"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
                  placeholder="Location ID"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#475569' }}>
                  API Key {chatbot.hasGhlApiKey && <span className="text-emerald-400">(saved)</span>}
                </label>
                <input
                  value={form.ghlApiKey}
                  onChange={e => setForm(f => ({ ...f, ghlApiKey: e.target.value }))}
                  type="password"
                  className="w-full px-3 py-2 text-sm rounded-lg text-white font-mono"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
                  placeholder={chatbot.hasGhlApiKey ? 'Leave blank to keep current' : 'Enter GHL API key'}
                />
              </div>
            </div>
          </div>

          {/* Slack Webhook */}
          <div className="glass rounded-xl p-5" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748b' }}>
              Slack Webhook URL
            </label>
            <input
              value={form.slackWebhookUrl}
              onChange={e => setForm(f => ({ ...f, slackWebhookUrl: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg text-white font-mono"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
              placeholder="https://hooks.slack.com/services/..."
            />
            <p className="text-[11px] mt-1.5" style={{ color: '#475569' }}>
              Used for "Notify Slack" follow-up actions.
            </p>
          </div>
        </div>

        {/* Right column - Follow-Up Rules */}
        <div className="space-y-5">
          {/* Follow-Up Rules Section */}
          <div className="glass rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Header */}
            <button
              onClick={() => setFollowUpExpanded(!followUpExpanded)}
              className="w-full flex items-center justify-between p-5"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg" style={{ background: 'rgba(59,130,246,0.12)' }}>
                  <Clock size={16} style={{ color: '#3b82f6' }} />
                </div>
                <span className="text-sm font-semibold text-white">Follow-Up Rules</span>
                {ruleCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ color: '#3b82f6', background: 'rgba(59,130,246,0.12)' }}>
                    {ruleCount}
                  </span>
                )}
              </div>
              {followUpExpanded ? <ChevronDown size={16} style={{ color: '#64748b' }} /> : <ChevronRight size={16} style={{ color: '#64748b' }} />}
            </button>

            {followUpExpanded && (
              <div className="px-5 pb-5 space-y-4">
                {/* Enable toggle */}
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={followUpRulesConfig.enabled}
                    onChange={e => setFollowUpRulesConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="rounded"
                    style={{ accentColor: '#3b82f6' }}
                  />
                  <span style={{ color: '#94a3b8' }}>Enable follow-up rules</span>
                </label>
                <p className="text-[11px]" style={{ color: '#475569' }}>
                  Automatically trigger actions when conversations go inactive or GHL opportunities stall.
                </p>

                {/* Rules list */}
                {followUpRulesConfig.rules.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-[12px] mb-2" style={{ color: '#475569' }}>No follow-up rules configured.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {followUpRulesConfig.rules.map((rule, ruleIdx) => (
                      <RuleCard
                        key={ruleIdx}
                        rule={rule}
                        ruleIndex={ruleIdx}
                        expanded={expandedRules[ruleIdx]}
                        onToggle={() => toggleRuleExpanded(ruleIdx)}
                        onUpdate={(field, value) => updateRule(ruleIdx, field, value)}
                        onRemove={() => removeRule(ruleIdx)}
                        onAddAction={() => addAction(ruleIdx)}
                        onRemoveAction={(actionIdx) => removeAction(ruleIdx, actionIdx)}
                        onUpdateAction={(actionIdx, field, value) => updateAction(ruleIdx, actionIdx, field, value)}
                      />
                    ))}
                  </div>
                )}

                {/* Add Rule button */}
                <button
                  onClick={addRule}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-colors"
                  style={{ color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.06)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.12)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(59,130,246,0.06)'}
                >
                  <Plus size={13} />
                  Add Rule
                </button>

                {/* Logs button */}
                <div className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <button
                    onClick={() => { setShowLogs(!showLogs); if (!showLogs) loadLogs(); }}
                    className="text-[11px] font-semibold transition-colors"
                    style={{ color: '#64748b' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
                    onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                  >
                    {showLogs ? 'Hide Execution Logs' : 'View Execution Logs'}
                  </button>

                  {showLogs && (
                    <div className="mt-3 space-y-1 max-h-60 overflow-y-auto">
                      {logs.length === 0 ? (
                        <p className="text-[11px]" style={{ color: '#475569' }}>No logs yet.</p>
                      ) : logs.map(log => (
                        <div key={log.id} className="flex items-center gap-2 text-[11px] py-1" style={{ color: '#64748b' }}>
                          <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'completed' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                          <span className="font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                          <span>Rule #{log.ruleIndex + 1}</span>
                          <span style={{ color: '#475569' }}>|</span>
                          <span>{ACTION_LABELS[log.actionType] || log.actionType}</span>
                          <span style={{ color: '#475569' }}>|</span>
                          <span className="truncate max-w-[120px]">{log.targetId}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Rule Card Component ─────────────────────────────────────

function RuleCard({ rule, ruleIndex, expanded, onToggle, onUpdate, onRemove, onAddAction, onRemoveAction, onUpdateAction }) {
  const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' };

  return (
    <div className="rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
      {/* Rule header */}
      <div className="flex items-center justify-between p-3">
        <button onClick={onToggle} className="flex items-center gap-2 flex-1 text-left">
          {expanded ? <ChevronDown size={14} style={{ color: '#64748b' }} /> : <ChevronRight size={14} style={{ color: '#64748b' }} />}
          <span className="text-[12px] font-semibold text-white">{rule.name || `Rule ${ruleIndex + 1}`}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: '#64748b', background: 'rgba(255,255,255,0.05)' }}>
            {rule.conditionType === 'opp_in_stage' ? 'Opp in Stage' : 'Inactive Conv.'}
          </span>
        </button>
        <button
          onClick={onRemove}
          className="p-1 rounded transition-colors"
          style={{ color: '#475569' }}
          onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
          onMouseLeave={e => e.currentTarget.style.color = '#475569'}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Rule Name */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#475569' }}>Name</label>
            <input
              value={rule.name}
              onChange={e => onUpdate('name', e.target.value)}
              className="w-full px-2.5 py-1.5 text-[12px] rounded-lg text-white"
              style={inputStyle}
              placeholder="Rule name..."
            />
          </div>

          {/* Condition Type */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#475569' }}>Condition</label>
            <select
              value={rule.conditionType}
              onChange={e => onUpdate('conditionType', e.target.value)}
              className="w-full px-2.5 py-1.5 text-[12px] rounded-lg text-white"
              style={inputStyle}
            >
              <option value="inactive_conversation">Conversation inactive for X days</option>
              <option value="opp_in_stage">Opportunity in stage for X days</option>
            </select>
          </div>

          {/* Days Threshold */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#475569' }}>Days Threshold</label>
            <input
              type="number"
              min={1}
              value={rule.daysThreshold}
              onChange={e => onUpdate('daysThreshold', parseInt(e.target.value) || 1)}
              className="w-24 px-2.5 py-1.5 text-[12px] rounded-lg text-white"
              style={inputStyle}
            />
          </div>

          {/* Pipeline & Stage (only for opp_in_stage) */}
          {rule.conditionType === 'opp_in_stage' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#475569' }}>Pipeline ID</label>
                <input
                  value={rule.pipelineId}
                  onChange={e => onUpdate('pipelineId', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[12px] rounded-lg text-white font-mono"
                  style={inputStyle}
                  placeholder="Pipeline ID"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#475569' }}>Stage ID</label>
                <input
                  value={rule.stageId}
                  onChange={e => onUpdate('stageId', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[12px] rounded-lg text-white font-mono"
                  style={inputStyle}
                  placeholder="Stage ID"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#475569' }}>Pipeline Name</label>
                <input
                  value={rule.pipelineName}
                  onChange={e => onUpdate('pipelineName', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[12px] rounded-lg text-white"
                  style={inputStyle}
                  placeholder="e.g. Sales"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#475569' }}>Stage Name</label>
                <input
                  value={rule.stageName}
                  onChange={e => onUpdate('stageName', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[12px] rounded-lg text-white"
                  style={inputStyle}
                  placeholder="e.g. New Lead"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>Actions</label>
            {(rule.actions || []).length === 0 ? (
              <p className="text-[11px] mb-2" style={{ color: '#475569' }}>No actions. Add at least one.</p>
            ) : (
              <div className="space-y-2">
                {rule.actions.map((action, actionIdx) => (
                  <ActionCard
                    key={actionIdx}
                    action={action}
                    onUpdate={(field, value) => onUpdateAction(actionIdx, field, value)}
                    onRemove={() => onRemoveAction(actionIdx)}
                  />
                ))}
              </div>
            )}
            <button
              onClick={onAddAction}
              className="flex items-center gap-1 mt-2 text-[11px] font-semibold transition-colors"
              style={{ color: '#64748b' }}
              onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
              onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
            >
              <Plus size={12} />
              Add Action
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Action Card Component ───────────────────────────────────

function ActionCard({ action, onUpdate, onRemove }) {
  const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' };

  return (
    <div className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-center gap-2 mb-2">
        <select
          value={action.type}
          onChange={e => onUpdate('type', e.target.value)}
          className="flex-1 px-2 py-1 text-[11px] rounded text-white"
          style={inputStyle}
        >
          <option value="send_message">Send Message</option>
          <option value="move_stage">Move Stage</option>
          <option value="add_tag">Add Tag</option>
          <option value="notify_slack">Notify Slack</option>
        </select>
        <button
          onClick={onRemove}
          className="p-0.5 rounded transition-colors"
          style={{ color: '#475569' }}
          onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
          onMouseLeave={e => e.currentTarget.style.color = '#475569'}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Conditional fields per action type */}
      {action.type === 'send_message' && (
        <textarea
          value={action.messageTemplate}
          onChange={e => onUpdate('messageTemplate', e.target.value)}
          rows={2}
          className="w-full px-2 py-1.5 text-[11px] rounded text-white resize-none"
          style={inputStyle}
          placeholder="Hey {{contactName}}, just checking in..."
        />
      )}

      {action.type === 'move_stage' && (
        <div className="grid grid-cols-2 gap-2">
          <input
            value={action.targetStageId}
            onChange={e => onUpdate('targetStageId', e.target.value)}
            className="px-2 py-1.5 text-[11px] rounded text-white font-mono"
            style={inputStyle}
            placeholder="Target Stage ID"
          />
          <input
            value={action.targetStageName}
            onChange={e => onUpdate('targetStageName', e.target.value)}
            className="px-2 py-1.5 text-[11px] rounded text-white"
            style={inputStyle}
            placeholder="Stage name (label)"
          />
        </div>
      )}

      {action.type === 'add_tag' && (
        <input
          value={(action.tags || []).join(', ')}
          onChange={e => onUpdate('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
          className="w-full px-2 py-1.5 text-[11px] rounded text-white"
          style={inputStyle}
          placeholder="tag1, tag2, tag3"
        />
      )}

      {action.type === 'notify_slack' && (
        <textarea
          value={action.slackMessage}
          onChange={e => onUpdate('slackMessage', e.target.value)}
          rows={2}
          className="w-full px-2 py-1.5 text-[11px] rounded text-white resize-none"
          style={inputStyle}
          placeholder="Follow-up needed for {{contactName}}"
        />
      )}
    </div>
  );
}
