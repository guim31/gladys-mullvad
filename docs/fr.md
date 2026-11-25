# Mullvad VPN

Vérifie que la connexion Internet de la maison sort bien par le [VPN Mullvad](https://mullvad.net/), comme le test de
connexion du site de Mullvad, et prévient vos scènes quand ce n'est plus le cas. Développée sans tunnel Mullvad du côté
du développeur : vos retours sont les bienvenus.

## Ce que vous obtenez

Un appareil **Mullvad VPN** avec trois fonctionnalités en lecture seule :

- **Via Mullvad** : 1 quand le trafic de Gladys sort sur Internet par un serveur Mullvad, 0 sinon.
- **IP sur liste noire** : 1 quand l'IP de sortie figure sur une liste noire connue de Mullvad (listes anti-spam…).
- **Pays de sortie** : le pays d'où Internet voit arriver votre trafic.

L'IP publique et le serveur Mullvad ne sont volontairement **pas** des fonctionnalités, pour ne jamais être gardés dans
l'historique : ils s'affichent dans le widget (l'IP seulement sur demande) et dans le message du bouton **Vérifier la
connexion maintenant**.

## Fonctionnement

Toutes les quelques minutes, l'intégration interroge `https://am.i.mullvad.net/json`, le test de connexion public de
Mullvad (sans compte ni clé). Seul **le trafic de Gladys** est vérifié : il dit si la maison sort par Mullvad quand le
VPN tourne sur la box, le routeur ou la machine qui héberge Gladys, pas si un autre ordinateur de la maison l'utilise.

## Installation

Dans Gladys, allez dans **Intégrations → Installer depuis GitHub** et saisissez
`https://github.com/guim31/gladys-mullvad`. Ouvrez ensuite l'onglet **Découverte** de l'intégration et ajoutez
l'appareil **Mullvad VPN**.

## Configuration

- **Intervalle de vérification** : de 1 à 60 minutes, 5 par défaut. Une petite requête à chaque fois.
- **Langue des noms de fonctionnalités** : la langue des noms de fonctionnalités (figés à l'ajout de l'appareil) et
  des messages. Français par défaut.

## Widget du tableau de bord

Le widget **Mullvad VPN** montre d'un coup d'œil : un « Oui » vert ou un « Non » rouge, le lieu de sortie, le serveur
Mullvad utilisé (ou votre fournisseur hors Mullvad), les listes noires et l'heure de la dernière vérification. Ses
réglages :

- **Afficher le serveur ou le fournisseur** (activé par défaut) ;
- **Afficher l'IP publique** (désactivé par défaut : toute personne voyant le tableau de bord la verrait) ;
- **Afficher le bouton « Vérifier »** (activé par défaut).

## Scènes

Déclencheurs :

- **La connexion ne passe plus par Mullvad** : une vérification voit le trafic sortir hors de Mullvad, alors qu'il
  passait par lui. Variable : pays de sortie.
- **La connexion repasse par Mullvad** : variables : pays de sortie, serveur Mullvad.
- **Vérification Mullvad injoignable** : deux vérifications de suite ont échoué. Souvent une coupure d'Internet, ou un
  kill switch qui bloque le trafic pendant que le tunnel est tombé. Variable : erreur. Une seule fois par coupure.

Action : **Vérifier la connexion Mullvad** vérifie tout de suite et donne `success`, `through_mullvad`, `country`,
`server` et `blacklisted` aux actions suivantes. Quand la vérification ne peut pas se faire, `success` vaut faux :
testez-le d'abord.

La première vérification après un démarrage ne déclenche jamais rien (il n'y a rien à comparer).

## Vérifier la connexion maintenant

Dans l'écran Configuration de l'intégration, le bouton **Vérifier la connexion maintenant** vérifie tout de suite et
affiche le résultat : par Mullvad ou non, serveur, lieu de sortie, fournisseur, IP publique et listes noires. Il
s'affiche en rouge quand am.i.mullvad.net est injoignable.

## Limites et vie privée

- Seul le trafic du conteneur de l'intégration Gladys est vérifié (voir « Fonctionnement »).
- Tant que la vérification échoue, les fonctionnalités gardent leur dernière valeur connue : un échec ne dit rien du
  tunnel.
- am.i.mullvad.net est un service public et gratuit de Mullvad, sans quota publié : gardez un intervalle raisonnable
  (une requête toutes les 5 minutes par défaut). Mullvad voit la requête, comme pour toute visite de son site.
- Rien n'est écrit sur le disque, et l'IP publique n'est jamais écrite dans les logs.

## Dépannage

- « am.i.mullvad.net est injoignable » : vérifiez la connexion Internet de Gladys, ou votre kill switch.
- Noms de fonctionnalités dans la mauvaise langue : changez la langue, puis supprimez et ajoutez de nouveau l'appareil
  (les noms sont figés à la création).
- Plus de détails avec `LOG_LEVEL=debug`. Signalez les problèmes sur
  [GitHub](https://github.com/guim31/gladys-mullvad/issues).

Cette intégration n'est pas affiliée à Mullvad VPN AB.
