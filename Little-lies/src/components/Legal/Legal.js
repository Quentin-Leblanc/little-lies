import React from 'react';
import './Legal.scss';

const Legal = ({ onClose }) => {
  return (
    <div className="legal-overlay" onClick={onClose}>
      <div className="legal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="legal-header">
          <h2>Mentions l&eacute;gales</h2>
          <button className="close-button" onClick={onClose}>X</button>
        </div>
        <div className="legal-content">

          <section>
            <h3><i className="fas fa-copyright"></i> Propri&eacute;t&eacute;</h3>
            <p>&copy; 2025 Quentin Leblanc &mdash; Among Liars</p>
            <p>Tous droits r&eacute;serv&eacute;s. Among Liars est un jeu ind&eacute;pendant de d&eacute;duction sociale multijoueur.</p>
          </section>

          <section>
            <h3><i className="fas fa-shield-halved"></i> Politique de confidentialit&eacute;</h3>
            <p>Among Liars collecte les donn&eacute;es suivantes :</p>
            <ul>
              <li><strong>Pseudo</strong> &mdash; choisi par le joueur, utilis&eacute; uniquement en jeu</li>
              <li><strong>Statistiques de jeu</strong> &mdash; r&eacute;sultats de parties, XP (stock&eacute;s en base de donn&eacute;es si connect&eacute;, sinon en local)</li>
              <li><strong>Cookies techniques</strong> &mdash; session de connexion uniquement, aucun tracking publicitaire</li>
            </ul>
            <p>Aucune donn&eacute;e n'est vendue ou partag&eacute;e avec des tiers. Les donn&eacute;es de jeu peuvent &ecirc;tre supprim&eacute;es sur demande.</p>
          </section>

          <section>
            <h3><i className="fas fa-gavel"></i> Conditions d'utilisation</h3>
            <ul>
              <li>Le jeu est gratuit et accessible &agrave; tous.</li>
              <li>Tout comportement toxique, triche ou harcnlement peut entra&icirc;ner un bannissement.</li>
              <li>Le contenu du jeu est fictif. Toute ressemblance avec des personnes r&eacute;elles est fortuite.</li>
            </ul>
          </section>

          <section>
            <h3><i className="fas fa-code"></i> Credits et technologies</h3>
            <div className="legal-credits">
              <div className="credit-item">
                <strong>React</strong> <span>Interface utilisateur</span>
              </div>
              <div className="credit-item">
                <strong>Three.js / React Three Fiber</strong> <span>Rendu 3D</span>
              </div>
              <div className="credit-item">
                <strong>PlayroomKit</strong> <span>Multijoueur temps r&eacute;el</span>
              </div>
              <div className="credit-item">
                <strong>Supabase</strong> <span>Authentification et base de donn&eacute;es</span>
              </div>
              <div className="credit-item">
                <strong>Framer Motion</strong> <span>Animations</span>
              </div>
              <div className="credit-item">
                <strong>Font Awesome</strong> <span>Ic&ocirc;nes (licence Free)</span>
              </div>
              <div className="credit-item">
                <strong>Google Fonts</strong> <span>Cinzel, Inter, Rajdhani (licence OFL/Apache)</span>
              </div>
            </div>
          </section>

          <section>
            <h3><i className="fas fa-info-circle"></i> Avertissement</h3>
            <p>Among Liars est un projet ind&eacute;pendant. Il n'est pas affili&eacute; &agrave; Town of Salem, Mafia, ou tout autre jeu de d&eacute;duction sociale existant.</p>
          </section>

          <p className="legal-version">Among Liars v0.1.0</p>
        </div>
      </div>
    </div>
  );
};

export default Legal;
