import api from './api';

export interface WhatsappConversation {
  id: number;
  companyId: number;
  whatsappNumber: string;
  clientId: number | null;
  displayName: string | null;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  client?: {
    nom: string;
    prenom: string | null;
  };
}

export interface WhatsappMessage {
  id: number;
  conversationId: number;
  waMessageId: string | null;
  direction: 'INBOUND' | 'OUTBOUND';
  type: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'AUDIO' | 'VIDEO';
  content: string | null;
  mediaUrl: string | null;
  mediaId: string | null;
  filename: string | null;
  mimeType: string | null;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  devisId: number | null;
  factureId: number | null;
  sentAt: string;
  createdAt: string;
}

export const whatsappApi = {
  getConversations: () => api.get('/whatsapp/conversations').then((r) => r.data as WhatsappConversation[]),
  getMessages: (convId: number) => api.get(`/whatsapp/conversations/${convId}/messages`).then((r) => r.data as WhatsappMessage[]),
  sendMessage: (to: string, message: string) => api.post('/whatsapp/send-message', { to, message }).then(r => r.data),
  sendDevis: (devisId: number, to: string) => api.post(`/whatsapp/send-devis/${devisId}`, { to }).then(r => r.data),
  sendFacture: (factureId: number, to: string) => api.post(`/whatsapp/send-facture/${factureId}`, { to }).then(r => r.data),
  reactToMessage: (messageId: number, emoji: string) => api.post(`/whatsapp/messages/${messageId}/react`, { emoji }).then(r => r.data),
  sendMedia: (conversationId: number, file: File) => {
    const formData = new FormData();
    formData.append('conversationId', String(conversationId));
    formData.append('file', file);
    return api.post('/whatsapp/send-media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};
