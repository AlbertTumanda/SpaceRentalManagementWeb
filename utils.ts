export const formatPHP = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const getMonthYear = (dateString: string): string => {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const getReminderMessage = (
  tenantName: string, 
  block: string, 
  amount: number, 
  dueDate: string, 
  template?: string
): string => {
  const defaultTemplate = "Hi {tenant}, this is a friendly reminder that your rent for Block {block} (₱{amount}) is due on {date}. Thank you!";
  const activeTemplate = template || defaultTemplate;

  return activeTemplate
    .replace(/{tenant}/g, tenantName)
    .replace(/{block}/g, block)
    .replace(/{amount}/g, amount.toLocaleString())
    .replace(/{date}/g, dueDate);
};

export const PAYMENT_METHOD_ICONS: Record<string, string> = {
  'Cash': '💵',
  'GCash': '📱',
  'Bank Transfer': '🏦',
  'Cheque': '✍️',
  'Other': '📎'
};
