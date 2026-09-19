import { randomUUID } from 'node:crypto'

// Small authoring helpers keep native references typed and avoid hand-escaped plist interpolation.
export function attachment(value) {
  return { Value: value, WFSerializationType: 'WFTextTokenAttachment' }
}
// Text/display fields use token strings, not data-flow attachments. NSString ranges use UTF-16 offsets.
export function tokenText(...parts) {
  let string = ''
  const attachmentsByRange = {}
  for (const part of parts) {
    if (typeof part === 'string') {
      if (part.includes('\uFFFC')) throw new TypeError('Unbound token placeholder')
      string += part
    } else if (part?.WFSerializationType === 'WFTextTokenAttachment' && part.Value?.Type) {
      attachmentsByRange[`{${string.length}, 1}`] = part.Value
      string += '\uFFFC'
    } else throw new TypeError('Expected text or typed attachment')
  }
  return { Value: { string, attachmentsByRange }, WFSerializationType: 'WFTextTokenString' }
}
export function output(action) {
  return attachment({
    Type: 'ActionOutput',
    OutputUUID: action.WFWorkflowActionParameters.UUID,
    OutputName: 'Result',
  })
}
export function input(value) {
  return { Type: 'Variable', Variable: value }
}
export function action(name, parameters = {}) {
  return {
    WFWorkflowActionIdentifier: `is.workflow.actions.${name}`,
    WFWorkflowActionParameters: { ...parameters, UUID: randomUUID().toUpperCase() },
  }
}
export function plist(value) {
  const escape = (text) =>
    text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;')
  if (typeof value === 'string') return `<string>${escape(value)}</string>`
  if (typeof value === 'boolean') return value ? '<true/>' : '<false/>'
  if (typeof value === 'number' && Number.isSafeInteger(value)) return `<integer>${value}</integer>`
  if (Array.isArray(value)) return `<array>${value.map(plist).join('')}</array>`
  if (value && typeof value === 'object')
    return `<dict>${Object.entries(value)
      .map(([key, item]) => `<key>${escape(key)}</key>${plist(item)}`)
      .join('')}</dict>`
  throw new TypeError('Unsupported plist value')
}
export function workflow(name, actions) {
  // These required metadata fields were checked by the macOS signing probe, not inferred from file extension alone.
  return {
    WFWorkflowName: name,
    WFWorkflowClientVersion: '3218.0.4.100',
    WFWorkflowMinimumClientVersion: 900,
    WFWorkflowMinimumClientVersionString: '900',
    WFWorkflowHasOutputFallback: false,
    WFWorkflowOutputContentItemClasses: [],
    WFWorkflowInputContentItemClasses: ['WFImageContentItem'],
    WFWorkflowTypes: ['ActionExtension'],
    WFWorkflowImportQuestions: [],
    WFWorkflowIcon: { WFWorkflowIconGlyphNumber: 61440, WFWorkflowIconStartColor: 431817727 },
    WFWorkflowActions: actions,
  }
}
export function xml(value) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">${plist(value)}</plist>\n`
}
