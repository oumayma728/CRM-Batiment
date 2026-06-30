SELECT wm.content, wm.direction, wm.type, wm.status, wm."sentAt"
FROM whatsapp_messages wm
JOIN whatsapp_conversations wc ON wc.id = wm."conversationId"
WHERE wc."whatsappNumber" = '21622411620'
ORDER BY wm."sentAt" DESC
LIMIT 5;
