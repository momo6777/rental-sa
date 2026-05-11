import { supabase } from './supabase';
import { getCompanySettings } from './companySettings';

export async function generateNotifications() {
  try {
    const settings = await getCompanySettings();
    const daysBeforeExpiry = settings.notification_days_before_expiry || 90;
    const urgentDays = 30;

    const now = new Date();
    const expiryDate = new Date(now.getTime() + daysBeforeExpiry * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const urgentDate = new Date(now.getTime() + urgentDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existingNotifications } = await supabase
      .from('notifications')
      .select('related_id, type')
      .eq('user_id', user.id)
      .eq('is_read', false);

    const existingSet = new Set((existingNotifications || []).map(n => `${n.type}:${n.related_id}`));

    const newNotifications: any[] = [];

    // Expiring contracts
    const { data: expiringContracts } = await supabase
      .from('contracts')
      .select('id, end_date, tenant:tenants(full_name_ar)')
      .eq('status', 'active')
      .lte('end_date', expiryDate);

    for (const c of expiringContracts || []) {
      const key = `contract_expiry:${c.id}`;
      if (existingSet.has(key)) continue;
      const daysLeft = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      newNotifications.push({
        user_id: user.id,
        title: daysLeft <= urgentDays ? '⚠️ عقد على وشك الانتهاء' : '📋 عقد يقترب من الانتهاء',
        message: `عقد المستأجر ${c.tenant?.full_name_ar || ''} ينتهي بعد ${daysLeft} يوم`,
        type: 'contract_expiry',
        related_id: c.id,
      });
    }

    // Overdue payments
    const { data: overduePayments } = await supabase
      .from('payments')
      .select('id, total_amount, due_date, contract:contracts(tenant:tenants(full_name_ar))')
      .eq('status', 'overdue');

    for (const p of overduePayments || []) {
      const key = `payment_overdue:${p.id}`;
      if (existingSet.has(key)) continue;
      newNotifications.push({
        user_id: user.id,
        title: '💳 دفعة متأخرة',
        message: `دفعة ${p.total_amount} ر.س من ${p.contract?.tenant?.full_name_ar || ''} متأخرة`,
        type: 'payment_overdue',
        related_id: p.id,
      });
    }

    // Urgent maintenance
    const { data: urgentMaintenance } = await supabase
      .from('maintenance_requests')
      .select('id, title, unit:units(unit_number)')
      .eq('priority', 'urgent')
      .in('status', ['open', 'in_progress']);

    for (const m of urgentMaintenance || []) {
      const key = `maintenance_urgent:${m.id}`;
      if (existingSet.has(key)) continue;
      newNotifications.push({
        user_id: user.id,
        title: '🔧 طلب صيانة عاجل',
        message: `${m.title} - وحدة ${m.unit?.unit_number || ''}`,
        type: 'maintenance_urgent',
        related_id: m.id,
      });
    }

    if (newNotifications.length > 0) {
      await supabase.from('notifications').insert(newNotifications);
    }
  } catch (err) {
    console.error('Error generating notifications:', err);
  }
}
