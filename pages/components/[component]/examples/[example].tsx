import Head from 'next/head'
import * as React from 'react'
import { useComponent } from 'hooks'
import { getSourceLink } from 'utils'
import { pascalCase } from 'case-anything'
import { allComponents } from '.data/components'

export default function Example({ component, example }) {
  const exampleElement = useComponent(example.compiledCode)
  return (
    <>
      <Head>
        <title>
          {pascalCase(component)} / {example.name}
        </title>
      </Head>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        {example.path && (
          <a href={getSourceLink({ path: example.path })}>View Source</a>
        )}
      </div>
      {exampleElement}
    </>
  )
}

export async function getStaticPaths() {
  const allExamples = allComponents.flatMap((component) => component.examples)
  return {
    paths: allExamples.map((example) => ({
      params: {
        component: example.parentSlug,
        example: example.slug,
      },
    })),
    fallback: false,
  }
}

export async function getStaticProps(query) {
  const allExamples = allComponents.flatMap((component) => component.examples)
  return {
    props: {
      component: query.params.component,
      example: allExamples.find(
        (example) =>
          example.parentSlug === query.params.component &&
          example.slug === query.params.example
      ),
    },
  }
}
