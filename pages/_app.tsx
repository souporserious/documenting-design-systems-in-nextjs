import Link from 'next/link'
import { useRouter } from 'next/router'
import { useRemoteRefresh } from 'next-remote-refresh/hook'

import { allComponents, allHooks } from '.data'

import '../app.css'

function Nav({ children }) {
  return (
    <nav role="navigation" style={{ padding: 16 }}>
      <ul>{children}</ul>
    </nav>
  )
}

function NavLink({ to, children }) {
  return (
    <li>
      <Link href={to} passHref>
        <a style={{ display: 'flex', fontSize: 18, padding: 8 }}>{children}</a>
      </Link>
    </li>
  )
}

export default function App({ Component, pageProps }) {
  const router = useRouter()

  if (process.env.NODE_ENV === 'development') {
    useRemoteRefresh()
  }

  if (
    router.asPath.includes('playground') ||
    router.asPath.includes('preview') ||
    router.asPath.includes('examples')
  ) {
    return <Component {...pageProps} />
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr' }}>
      <Nav>
        <NavLink to="/">👻</NavLink>
        <NavLink to="/playground">Playground</NavLink>
        <li>
          <h3 style={{ padding: 8 }}>Components</h3>
        </li>
        {allComponents.map(({ name, slug }) => (
          <NavLink key={name} to={`/components/${slug}`}>
            {name}
          </NavLink>
        ))}
        <li>
          <h3 style={{ padding: 8 }}>Hooks</h3>
        </li>
        {allHooks.map(({ name, slug }) => (
          <NavLink key={name} to={`/hooks/${slug}`}>
            {name}
          </NavLink>
        ))}
      </Nav>
      <div style={{ padding: 40 }}>
        <Component {...pageProps} />
      </div>
    </div>
  )
}
