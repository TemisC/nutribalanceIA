import supabase from '../config/db';

export interface DBMessage {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    is_read: boolean;
    created_at: Date;
    type?: 'chat' | 'system';
}

export const sendMessage = async (message: DBMessage) => {
    const { error } = await supabase.from('messages').insert({
        id: message.id,
        sender_id: message.sender_id,
        receiver_id: message.receiver_id,
        content: message.content,
        is_read: message.is_read || false,
        type: message.type || 'chat',
    });
    if (error) throw error;
};

/** @deprecated Table is now created in Supabase SQL Editor */
export const initMessageTable = async () => {
    console.log('[initMessageTable] Skipped — table managed in Supabase.');
};

export const getMessagesForUser = async (userId: string): Promise<any[]> => {
    const { data, error } = await supabase
        .from('messages')
        .select('*, sender:sender_id(name)')
        .or(`receiver_id.eq.${userId},sender_id.eq.${userId}`)
        .order('created_at', { ascending: false });

    if (error || !data) return [];

    return (data as any[]).map(m => ({
        ...m,
        sender_name: m.sender?.name,
        sender: undefined,
    }));
};

export const markMessageAsRead = async (messageId: string) => {
    const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);
    if (error) throw error;
};

export const getConversation = async (user1: string, user2: string): Promise<DBMessage[]> => {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
            `and(sender_id.eq.${user1},receiver_id.eq.${user2}),and(sender_id.eq.${user2},receiver_id.eq.${user1})`
        )
        .order('created_at', { ascending: true });
    if (error || !data) return [];
    return data as DBMessage[];
};
