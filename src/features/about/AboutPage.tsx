import { Link } from 'react-router-dom';
import './about.css';

const differentiators = [
  ['Raíces locales', 'Cada recomendación nace de personas, oficios y lugares que hacen parte del Suroeste.'],
  ['Rutas con sentido', 'Diseñamos visitas que dejan espacio para conversar, contemplar y descubrir sin afán.'],
  ['Viajes cercanos', 'Conectamos viajeros curiosos con experiencias pequeñas, honestas y memorables.'],
];

export function AboutPage() {
  return (
    <article className="about-page">
      <header className="about-hero" aria-labelledby="about-title">
        <p className="about-eyebrow">PARADISSE · Suroeste Antioqueño</p>
        <h1 id="about-title">Quiénes somos</h1>
        <p>Somos una invitación a mirar de nuevo lo que está cerca: el paisaje, la gente y las historias de una región que sabe recibir.</p>
      </header>

      <section className="about-story" aria-labelledby="about-story-title">
        <img src="/assets/paradisse-hero.png" alt="Montañas y naturaleza del Suroeste Antioqueño" />
        <div>
          <p className="about-eyebrow">Nuestra historia</p>
          <h2 id="about-story-title">Nacimos para que viajar vuelva a sentirse personal</h2>
          <p>PARADISSE empieza con una pregunta sencilla: ¿qué pasa cuando elegimos conocer un territorio a través de quienes lo habitan?</p>
          <p>La respuesta está en un café compartido, una plaza al atardecer y una ruta que no necesita correr para convertirse en recuerdo.</p>
        </div>
      </section>

      <section className="about-purpose" aria-label="Misión y visión de PARADISSE">
        <article>
          <p className="about-eyebrow">Misión</p>
          <h2>Acercar viajeros al corazón del Suroeste</h2>
          <p>Inspiramos escapadas responsables que reconocen el valor cultural, natural y humano de cada municipio.</p>
        </article>
        <article>
          <p className="about-eyebrow">Visión</p>
          <h2>Ser la puerta de entrada a una región viva</h2>
          <p>Queremos que más personas descubran el Suroeste Antioqueño y que ese encuentro fortalezca a sus comunidades.</p>
        </article>
      </section>

      <section className="about-differentiators" aria-labelledby="about-differentiators-title">
        <p className="about-eyebrow">Lo que nos mueve</p>
        <h2 id="about-differentiators-title">Una manera distinta de recorrer la región</h2>
        <div>
          {differentiators.map(([title, description]) => (
            <article key={title}><h3>{title}</h3><p>{description}</p></article>
          ))}
        </div>
      </section>

      <section className="about-cta" aria-labelledby="about-cta-title">
        <h2 id="about-cta-title">Tu próxima historia puede empezar cerca.</h2>
        <Link to="/destinos">Conocer los destinos</Link>
      </section>
    </article>
  );
}
