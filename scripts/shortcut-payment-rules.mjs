// Shared native/fixture patterns deliberately require whole labelled fields, not arbitrary screen numbers.
// Full-width digit normalization belongs before these expressions; ambiguous OCR letters are never changed.
export const decimal = '(?:[1-9][0-9]{0,2}(?:,[0-9]{3})+|0|[1-9][0-9]*)(?:\\.[0-9]{1,2})?'
export const amountLabel = '(?:实付金额|实际支付|支付金额|付款金额)'
export const amountPattern = `^[ \\t]*${amountLabel}[ \\t:：]*(?:\\n[ \\t]*)?(?:[¥￥]|CNY|人民币)?[ \\t]*${decimal}[ \\t]*(?:元)?[ \\t]*$`
// A standalone RMB line is a fallback only; balance/discount/original-price lines cannot match it.
export const currencyPattern = `^[ \\t]*[¥￥][ \\t]*${decimal}[ \\t]*(?:元)?[ \\t]*$`
export const timeLabel = '(?:支付时间|交易时间|付款时间)'
export const timePattern = `^[ \\t]*${timeLabel}[ \\t:：]*(?:\\n[ \\t]*)?[12][0-9]{3}[-/年.](?:0?[1-9]|1[0-2])[-/月.](?:0?[1-9]|[12][0-9]|3[01])日?[ T]+(?:[01]?[0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])?[ \\t]*$`
export const amountPrefixPattern = `^[ \\t]*(?:${amountLabel}[ \\t:：]*(?:\\n[ \\t]*)?)?(?:[¥￥]|CNY|人民币)?[ \\t]*`
export const timePrefixPattern = `^[ \\t]*${timeLabel}[ \\t:：]*(?:\\n[ \\t]*)?`

export function normalizeOcr(text) {
  return text
    .replace(/[０-９]/g, (digit) => String(digit.charCodeAt(0) - 0xff10))
    .replaceAll('．', '.')
    .replaceAll('，', ',')
    .replaceAll('：', ':')
    .replaceAll('\r\n', '\n')
}
export function fixtureCandidates(text) {
  const normalized = normalizeOcr(text)
  const labelled = normalized.match(new RegExp(amountPattern, 'gm')) ?? []
  return {
    amounts: labelled.length
      ? labelled
      : (normalized.match(new RegExp(currencyPattern, 'gm')) ?? []),
    times: normalized.match(new RegExp(timePattern, 'gm')) ?? [],
  }
}
