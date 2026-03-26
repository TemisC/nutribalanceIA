import supabase from '../config/db';

export interface SubscriptionRequest {
    id: number;
    user_id: string;
    coach_id?: string;
    requested_role: string;
    status: 'pending' | 'approved' | 'rejected';
    amount?: number;
    admin_notes?: string;
    created_at: string;
    updated_at: string;
    user_name?: string;  // Enriched via join
    coach_name?: string; // Enriched via join
}

export const createSubscriptionRequest = async (
    userId: string,
    requestedRole: string,
    amount?: number,
    coachId?: string
): Promise<number> => {
    const { data, error } = await supabase
        .from('subscription_requests')
        .insert({
            user_id: userId,
            requested_role: requestedRole,
            amount: amount || 0,
            coach_id: coachId || null,
        })
        .select('id')
        .single();

    if (error) throw error;
    return (data as any).id;
};

export const getPendingSubscriptions = async (): Promise<SubscriptionRequest[]> => {
    const { data, error } = await supabase
        .from('subscription_requests')
        .select('*, user:user_id(name), coach:coach_id(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error || !data) return [];

    return (data as any[]).map(row => ({
        ...row,
        user_name: row.user?.name,
        coach_name: row.coach?.name,
        user: undefined,
        coach: undefined,
    })) as SubscriptionRequest[];
};

export const updateSubscriptionStatus = async (
    id: number,
    status: 'approved' | 'rejected',
    adminNotes?: string
): Promise<boolean> => {
    const { error } = await supabase
        .from('subscription_requests')
        .update({ status, admin_notes: adminNotes || null, updated_at: new Date().toISOString() })
        .eq('id', id);
    return !error;
};

export const getRequestById = async (id: number): Promise<SubscriptionRequest | null> => {
    const { data, error } = await supabase
        .from('subscription_requests')
        .select('*')
        .eq('id', id)
        .single();
    if (error || !data) return null;
    return data as SubscriptionRequest;
};
