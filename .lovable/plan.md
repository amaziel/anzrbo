# Plan de correction des routes et QR

## Objectif
Rendre les pages publiques et protégées fiables sur mobile et ordinateur, avec une recherche membre et des QR déjà imprimés fonctionnels.

## Étapes
1. Inventorier les routes, protections et formats historiques des liens QR.
2. Corriger la résolution des numéros et les redirections sans casser les anciennes cartes.
3. Ajouter une vérification automatisée des routes publiques et protégées, des 404 et des écrans blancs.
4. Tester sur ordinateur et mobile : accès direct à `/print`, recherche par les deux numéros, scan/lien QR, connexion et pages protégées.
5. Valider le build de publication et documenter la commande de contrôle.

## Détails techniques
- Utiliser les routes TanStack existantes et leurs protections par rôle.
- Tester les réponses HTTP, l’URL finale après redirection et la présence d’un contenu visible.
- Conserver la compatibilité avec les formats de QR déjà imprimés.
