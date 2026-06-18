SELECT d.id, d."clientId", d.reference, d.statut, d."chantierId", c.nom, c.telephone
FROM devis d
JOIN clients c ON c.id = d."clientId"
WHERE c.telephone IS NOT NULL
  AND c.telephone != ''
  AND d.statut IN ('ACCEPTE','SIGNE','ENVOYE')
LIMIT 5;
