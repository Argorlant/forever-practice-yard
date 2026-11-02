export const DRUID_FORMS = ['cat', 'bear', 'dire-bear', 'moonkin', 'travel', 'aquatic', 'tree'] as const;
export type DruidForm = typeof DRUID_FORMS[number];

export const FORM_NAMES: Record<DruidForm, string> = {
  cat: 'Cat Form', bear: 'Bear Form', 'dire-bear': 'Dire Bear Form', moonkin: 'Moonkin Form',
  travel: 'Travel Form', aquatic: 'Aquatic Form', tree: 'Tree Form',
};

/** Classic races use SD; Skyborne keeps HD until its own SD models exist. */
export function formDefinition(race: string | undefined, form: DruidForm): 'sd' | 'hd' {
  return /^(highorder|windshaper)(?:-|$)/.test(race ?? '') && form !== 'aquatic' && form !== 'tree' ? 'hd' : 'sd';
}

export function druidFormKeys(race: string | undefined, form: DruidForm): string[] {
  const who = race?.split('-')[0] || 'nightelf';
  return who === 'nightelf' ? [`form-${form}@nightelf`, `form-${form}`] : [`form-${form}@${who}`];
}
