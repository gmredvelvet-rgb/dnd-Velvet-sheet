/** Display-only item data. Prefer the system's prepared labels; never roll or post chat. */
export const DETAIL_LABELS = {
  rank: 'Rank', level: 'Level', school: 'School', time: 'Activation', range: 'Range',
  target: 'Target', area: 'Area', defense: 'Defense / save', duration: 'Duration',
  traditions: 'Traditions', components: 'Components', materials: 'Materials',
  requirements: 'Requirements', trigger: 'Trigger', cost: 'Cost', frequency: 'Frequency'
};

const text = value => typeof value === 'string' || typeof value === 'number' ? String(value) : '';
const localize = value => globalThis.game?.i18n?.localize?.(text(value)) ?? text(value);
const label = (config, key) => localize(config?.[key]?.label ?? config?.[key] ?? key);
const values = value => value instanceof Set ? [...value] : Array.isArray(value) ? value : [];
const field = value => text(value) || text(value?.value);
const join = parts => parts.map(text).filter(Boolean).join(' · ');

function measurement(value, config = {}) {
  if (text(value)) return text(value);
  if (!value) return '';
  const units = value.units && value.units !== 'none' ? label(config, value.units) : '';
  const amount = field(value);
  return [amount, value.long ? `/ ${value.long}` : '', units].filter(Boolean).join(' ');
}

export function itemCardDetails(item) {
  const system = item?.system ?? {};
  // Identification must not reveal hidden magical properties in an info card.
  if (!globalThis.game?.user?.isGM && (item?.isIdentified === false || system.identified === false)) {
    return { traits: [], facts: [] };
  }
  const pf = globalThis.CONFIG?.PF2E ?? {};
  const dnd = globalThis.CONFIG?.DND5E ?? {};
  const pfLike = ['pf2e', 'sf2e', 'starfinder2e', 'starfinder'].includes(globalThis.game?.system?.id)
    || Array.isArray(system.traits?.value);
  const activity = system.activities?.contents?.find(a => !a.isHidden && a.activation)
    ?? system.activities?.contents?.find(a => !a.isHidden);
  const labels = { ...item?.labels, ...activity?.labels };
  const facts = [];
  const add = (key, value) => { if (text(value).trim()) facts.push([key, text(value).trim()]); };
  const traits = [];

  if (pfLike) {
    const traitConfig = item?.constructor?.validTraits ?? pf[`${item?.type}Traits`] ?? {};
    traits.push(...values(system.traits?.value).map(key => label(traitConfig, key)));
    const rarity = system.traits?.rarity;
    if (rarity && rarity !== 'common') traits.unshift(label(pf.rarityTraits, rarity));
    if (item?.type === 'spell') {
      add('rank', item.rank ?? field(system.level));
      add('traditions', join(values(item.traditions ?? system.traits?.traditions).map(key => label(pf.magicTraditions, key))));
    } else add('level', field(system.level));

    const cost = item?.actionCost;
    const actionType = cost?.type ?? system.actionType?.value;
    const time = field(system.time) || (actionType === 'action' ? text(cost?.value ?? system.actions?.value) : actionType);
    add('time', /^\d(?:\s*(?:to|or|[-–])\s*\d)*$/.test(time) ? `${time} ${time === '1' ? 'action' : 'actions'}`
      : time === 'reaction' ? 'Reaction' : time === 'free' ? 'Free action' : time === 'passive' ? 'Passive' : time);
    add('range', field(system.range));
    add('target', field(system.target));
    add('area', item?.area?.label || (system.area?.type
      ? [field(system.area), 'feet', label(pf.areaTypes, system.area.type)].filter(Boolean).join(' ') : ''));
    const save = system.defense?.save ?? system.save;
    add('defense', join([
      system.defense?.passive?.statistic ? label(pf.dcTypes ?? {
        ac: 'Armor class', 'fortitude-dc': 'Fortitude DC', 'reflex-dc': 'Reflex DC', 'will-dc': 'Will DC'
      }, system.defense.passive.statistic) : '',
      save?.statistic || save?.value ? `${save.basic ? 'Basic ' : ''}${label(pf.saves, save.statistic ?? save.value)}` : ''
    ]));
    add('duration', join([system.duration?.sustained ? 'Sustained' : '', field(system.duration)]));
    add('requirements', field(system.requirements));
    add('trigger', field(system.trigger));
    add('cost', field(system.cost));
    add('materials', field(system.materials));
    const frequency = system.frequency;
    add('frequency', frequency?.max ? `${frequency.max} / ${label(pf.frequencies, frequency.per)}` : field(frequency));
  } else {
    traits.push(...values(system.properties).map(key => label(dnd.itemProperties, key)));
    traits.push(...values(labels.components?.tags));
    if (item?.type === 'spell') {
      add('level', field(system.level));
      add('school', system.school ? label(dnd.spellSchools, system.school) : '');
      for (const [key, name] of [['concentration', 'Concentration'], ['ritual', 'Ritual']]) {
        if (system.components?.[key]) traits.push(name);
      }
    }
    if (system.rarity && system.rarity !== 'common') traits.unshift(label(dnd.itemRarity, system.rarity));
    const activation = activity?.activation ?? system.activation;
    add('time', labels.ritualActivation || labels.activation || (activation?.type
      ? [text(activation.value), label(dnd.abilityActivationTypes, activation.type)].filter(Boolean).join(' ')
      : measurement(activation)));
    add('range', labels.range || measurement(activity?.range ?? system.range, dnd.distanceUnits));
    const target = activity?.target ?? system.target;
    add('target', labels.target || (target?.affects
      ? [field(target.affects.count), label(dnd.individualTargetTypes, target.affects.type), target.affects.special].filter(Boolean).join(' ')
      : [measurement(target, dnd.distanceUnits), text(target?.type)].filter(Boolean).join(' ')));
    const area = target?.template;
    add('area', area?.type ? [field(area.size), label(dnd.distanceUnits, area.units), label(dnd.areaTargetTypes, area.type)].filter(Boolean).join(' ') : '');
    const save = activity?.save ?? system.save;
    const abilities = values(save?.ability).length ? values(save.ability) : [text(save?.ability)].filter(Boolean);
    add('defense', labels.save || join([save?.dc?.value ?? (typeof save?.dc === 'number' ? save.dc : ''), ...abilities.map(key => label(dnd.abilities, key))]));
    add('duration', labels.concentrationDuration || labels.duration || measurement(activity?.duration ?? system.duration, dnd.timePeriods));
    const components = labels.components?.vsm || ['vocal', 'somatic', 'material'].filter(key => system.components?.[key])
      .map(key => ({ vocal: 'V', somatic: 'S', material: 'M' })[key]).join(', ');
    add('components', components);
    add('materials', labels.materials || field(system.materials));
    add('trigger', activation?.condition);
    add('requirements', field(system.requirements));
  }
  return { traits: [...new Set(traits.filter(Boolean))], facts };
}

export function itemDetailsHTML(item) {
  const { traits, facts } = itemCardDetails(item);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  return `${traits.length ? `<div class="velvet-inspector-traits">${traits.map(trait => `<span>${esc(trait)}</span>`).join('')}</div>` : ''}
    ${facts.length ? `<dl class="velvet-inspector-facts">${facts.map(([key, value]) => `<div><dt>${esc(DETAIL_LABELS[key])}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>` : ''}`;
}
