import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader, PortraitCard } from '../../../shared/components'
import { usePageTitle } from '../../../shared/hooks/usePageTitle'
import { engineeringPrinciples } from '../data/profile'

export function AboutPage() {
  usePageTitle('About')

  return (
    <section className="page inner-page about-page">
      <PageHeader
        eyebrow="ABOUT LIAM"
        title="Learning by building, from the data layer outward."
        aside={<PortraitCard compact />}
      />

      <div className="about-columns">
        <div>
          <h2>My direction</h2>
          <p>
            I am Liam Victor Sirbon, a software engineering student based in Cape Town. I work across web applications, APIs, databases and mobile development, and I am most interested in how separate parts of a system fit together.
          </p>
          <p>
            At CPUT, I completed a Higher Certificate in 2024 and am pursuing a Diploma in IT Applications Development, expected in 2027. My studies and projects have given me practical experience with React, TypeScript, JavaScript, Java, Python, C++, Spring Boot, Flutter/Dart, MySQL and Linux.
          </p>
        </div>
        <div>
          <h2>How I work</h2>
          <p>
            I start with the actual problem: what information needs to move through the system, who needs to use it and where the design could break. That leads into database structure, application boundaries and deployment decisions.
          </p>
          <p>
            I have worked as a class representative and group leader. Those roles taught me to communicate clearly, divide work fairly and keep a team moving through incomplete or changing requirements.
          </p>
        </div>
      </div>

      <div className="principles">
        {engineeringPrinciples.map((principle) => (
          <article key={principle.number} className="principle-item">
            <span className="index-number">{principle.number}</span>
            <h2>{principle.title}</h2>
            <p>{principle.description}</p>
          </article>
        ))}
      </div>

      <div className="cta-strip">
        <div>
          <h2>Want to see how this translates into real work?</h2>
          <p>Browse documented university projects and relational database case studies.</p>
        </div>
        <div className="actions-inline">
          <Link className="button primary" to="/projects">
            Explore projects <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link className="button" to="/experience">Education &amp; leadership</Link>
        </div>
      </div>
    </section>
  )
}
