// modified from: https://github.com/suren-atoyan/monaco-react/blob/master/src/Editor/Editor.js
import * as React from 'react'
import loader from '@monaco-editor/loader'
import { useRouter } from 'next/router'
import { kebabCase } from 'case-anything'
import { usePlaygroundList, usePlaygroundPosition } from 'atoms'
import { initializeMonaco } from '../utils/initialize-monaco'
import type { Monaco } from '../utils/initialize-monaco'

export type MonacoOptions = {
  containerRef: React.RefObject<HTMLElement>
  value?: string
  id?: number
  onChange?: (value: string) => void
  decorationRange?: {
    startLine: number
    startColumn: number
    endLine: number
    endColumn: number
  }
}

export function useMonaco({
  containerRef,
  value,
  id,
  onChange,
  decorationRange,
}: MonacoOptions) {
  const router = useRouter()
  const [isMounting, setIsMounting] = React.useState(true)
  const monacoRef = React.useRef<Monaco>(null)
  const editorRef = React.useRef<ReturnType<Monaco['editor']['create']>>(null)
  const decorationsRef = React.useRef([])
  const [list] = usePlaygroundList()
  const [position, setPosition] = usePlaygroundPosition()

  React.useEffect(() => {
    const cancelable = loader.init()

    cancelable
      .then(async (monaco) => {
        monacoRef.current = monaco
        editorRef.current = await initializeMonaco({
          container: containerRef.current,
          monaco,
          defaultValue: value,
          id,
          onOpenEditor: (input) => {
            const [base, filename] = input.resource.path
              .replace('/node_modules/', '') // trim node_modules prefix used by Monaco Editor
              .replace('.d.ts', '') // trim .d.ts suffix from decalaration
              .split('/') // finally split the path into an array
            if (base === 'components' || base === 'hooks') {
              router.push(
                filename === 'index'
                  ? `/${base}`
                  : `/${base}/${kebabCase(filename)}`
              )
            }
          },
        })
        setIsMounting(false)
      })
      .catch((error) => {
        if (error?.type !== 'cancelation') {
          console.error('Monaco initialization: error:', error)
        }
      })

    return () => {
      if (editorRef.current) {
        editorRef.current.getModel()?.dispose()
        editorRef.current.dispose()
      } else {
        cancelable.cancel()
      }
    }
  }, [])

  React.useEffect(() => {
    if (isMounting) return

    const handleChange = editorRef.current.onDidChangeModelContent(() => {
      onChange(editorRef.current.getValue())
    })

    return () => handleChange.dispose()
  }, [isMounting])

  React.useEffect(() => {
    if (isMounting) return

    const handleChangeCursor = editorRef.current.onDidChangeCursorPosition(
      () => {
        const { lineNumber } = editorRef.current.getPosition()
        const element = list
          .slice()
          .reverse()
          .find((element) => {
            const { startLine, endLine } = element.position
            return lineNumber >= startLine && lineNumber <= endLine
          })

        /**
         * TODO: account for multiple elements (columns), this only works for
         * one element right now. Also need to account for multiple cursors.
         */
        setPosition(element ? element.position : null)
      }
    )

    return () => handleChangeCursor.dispose()
  }, [isMounting, list])

  React.useEffect(() => {
    if (isMounting) return

    const handleBlur = editorRef.current.onDidBlurEditorWidget(() => {
      setPosition(null)
    })

    return () => handleBlur.dispose()
  }, [isMounting])

  React.useEffect(() => {
    if (isMounting) return

    const handleKeyDown = editorRef.current.onKeyDown(async (event) => {
      /** Format file on save (metaKey + s) */
      if (event.keyCode === 49 && event.metaKey) {
        event.preventDefault()
        editorRef.current.getAction('editor.action.formatDocument').run()
      }
    })

    return () => handleKeyDown.dispose()
  }, [isMounting])

  React.useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== value) {
      const currentModel = editorRef.current.getModel()
      if (currentModel) {
        editorRef.current.executeEdits('', [
          {
            range: currentModel.getFullModelRange(),
            text: value,
            forceMoveMarkers: true,
          },
        ])
        editorRef.current.pushUndoStop()
      } else {
        editorRef.current.setValue(value)
      }
    }
  }, [value])

  React.useEffect(() => {
    if (isMounting) return

    decorationsRef.current = editorRef.current.deltaDecorations(
      decorationsRef.current,
      decorationRange
        ? [
            {
              range: new monacoRef.current.Range(
                decorationRange.startLine,
                decorationRange.startColumn,
                decorationRange.endLine,
                decorationRange.endColumn
              ),
              options: {
                className: 'line-decorator',
                isWholeLine: true,
              },
            },
          ]
        : []
    )
  }, [decorationRange, isMounting])
}
