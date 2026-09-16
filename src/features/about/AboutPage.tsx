import { Link } from 'react-router-dom';
import type { IconType } from 'react-icons';
import { FiArrowRight, FiCoffee, FiCompass, FiFeather, FiHeart, FiMap, FiMapPin, FiShield, FiStar, FiUsers } from 'react-icons/fi';
import './about.css';

type AboutValue = {
  title: string;
  description: string;
  icon: IconType;
};

const values: AboutValue[] = [
  {
    title: 'Raíces locales',
    description: 'Cada recomendación nace de personas, oficios y lugares que hacen parte del Suroeste.',
    icon: FiUsers,
  },
  {
    title: 'Rutas con sentido',
    description: 'Diseñamos visitas que dejan espacio para conversar, contemplar y descubrir sin afán.',
    icon: FiCompass,
  },
  {
    title: 'Viajes cercanos',
    description: 'Conectamos viajeros curiosos con experiencias pequeñas, honestas y memorables.',
    icon: FiHeart,
  },
];

export function AboutPage() {
  return (
    <article className="about-page">
      <header className="about-hero" aria-labelledby="about-title">
        <img className="about-hero__backdrop" src="/assets/suroeste-landscape.webp" alt="Pueblo colorido entre montañas del Suroeste Antioqueño" />
        <div className="about-hero__shade" aria-hidden="true" />
        <div className="about-hero__content">
          <p className="about-eyebrow"><FiMapPin aria-hidden="true" /> PARADISSE · SUROESTE ANTIOQUEÑO</p>
          <h1 id="about-title">Quiénes <strong>somos</strong></h1>
          <p className="about-hero__lead">Somos una invitación a mirar de nuevo lo que está cerca: el paisaje, la gente y las historias de una región que sabe recibir.</p>
          <div className="about-hero__meta" aria-label="Identidad de PARADISSE">
            <span><FiMap aria-hidden="true" /> Una región, muchas historias</span>
            <span><FiCoffee aria-hidden="true" /> Viajes con sabor local</span>
          </div>
        </div>
      </header>

      <section className="about-story" aria-labelledby="about-story-title">
        <div className="about-story__image">
          <img src="/assets/figma-andes.webp" alt="Viajeros descubriendo un pueblo del Suroeste Antioqueño" />
          <span className="about-story__stamp"><FiHeart aria-hidden="true" /> Hecho cerca</span>
        </div>
        <div className="about-story__content">
          <p className="about-eyebrow">Nuestra historia</p>
          <h2 id="about-story-title">Nacimos para que viajar vuelva a sentirse <em>personal</em></h2>
          <p>PARADISSE empieza con una pregunta sencilla: ¿qué pasa cuando elegimos conocer un territorio a través de quienes lo habitan?</p>
          <p>La respuesta está en un café compartido, una plaza al atardecer y una ruta que no necesita correr para convertirse en recuerdo.</p>
          <div className="about-story__quote"><FiStar aria-hidden="true" /><span>Lo que hace especial un destino es la historia que te llevas.</span></div>
        </div>
      </section>

      <section className="about-purpose" aria-label="Misión y visión de PARADISSE">
        <div className="about-section-heading">
          <p className="about-eyebrow">Nuestro propósito</p>
          <h2>Una forma más humana de descubrir</h2>
        </div>
        <div className="about-purpose__grid">
          <article>
            <span className="about-card-icon"><FiFeather aria-hidden="true" /></span>
            <p className="about-eyebrow">Misión</p>
            <h3>Acercar viajeros al corazón del Suroeste</h3>
            <p>Inspiramos escapadas responsables que reconocen el valor cultural, natural y humano de cada municipio.</p>
          </article>
          <article>
            <span className="about-card-icon"><FiShield aria-hidden="true" /></span>
            <p className="about-eyebrow">Visión</p>
            <h3>Ser la puerta de entrada a una región viva</h3>
            <p>Queremos que más personas descubran el Suroeste Antioqueño y que ese encuentro fortalezca a sus comunidades.</p>
          </article>
        </div>
      </section>

      <section className="about-differentiators" aria-labelledby="about-differentiators-title">
        <div className="about-section-heading">
          <p className="about-eyebrow">Lo que nos mueve</p>
          <h2 id="about-differentiators-title">Una manera distinta de recorrer la región</h2>
        </div>
        <div className="about-differentiators__grid">
          {values.map(({ title, description, icon: Icon }) => (
            <article key={title}>
              <span className="about-card-icon"><Icon aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-cta" aria-labelledby="about-cta-title">
        <div>
          <p className="about-eyebrow">Tu próxima historia</p>
          <h2 id="about-cta-title">Puede empezar mucho más cerca de lo que imaginas.</h2>
        </div>
        <Link to="/destinos">Conocer los destinos <FiArrowRight aria-hidden="true" /></Link>
      </section>
    </article>
  );
}
