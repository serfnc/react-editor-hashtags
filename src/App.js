// Import React dependencies.
import React, {useEffect, useMemo, useState, useCallback, useRef} from "react"

// Import the Slate editor factory.
import {createEditor, Editor, Point, Range, Transforms} from 'slate'

// Import the Slate components and React plugin.
import {Editable, ReactEditor, Slate, useEditor, useFocused, useReadOnly, useSelected, useSlate, withReact} from 'slate-react'

import ReactDOM from 'react-dom'

// Styling
import './App.css';

const tagsList = [
  'liver',
  'pain',
  'right',
  'left',
  'pancreas',
  'kidney',
  'brain',
  'severe_pain',
  'tumour',
  'cancer',
  'MRI',
  'CT',
  'male',
  'female',
  'bone',
  'shoulder',
  'hip',
  'XRAY',
  'knee',
  'spine',
  'head',
  'abdomen',
  'contrast',
  'fragment',
  'detached',
  'injury',
  'torn',
  'rotator',
  'cuff',
  'abdominal',
  'dilatation'
]

const App = () => {
  const editor = useMemo(() => withTags(withReact(createEditor())), [])
  
  const [tagTarget, setTagTarget] = useState(null)

  const tagRef = useRef(null)

  const [index, setIndex] = useState(0)
  const [search, setSearch] = useState('')

  // Add the initial value when setting up our state.
  const [value, setValue] = useState([
    {
      type: 'paragraph',
      children: [{ text: 'A line of text in a paragraph.' }],
    },
  ])

  const renderElement = useCallback(props => <Element {...props} />, [])

  const tags = tagsList.filter(c =>
    c.toLowerCase().startsWith(search.toLowerCase())
  ).slice(0, 10)

  const onKeyDown = event => {
    console.log('key down', tagTarget)
    if (tagTarget) {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          const prevIndex = index >= tags.length - 1 ? 0 : index + 1
          setIndex(prevIndex)
          break
        case 'ArrowUp':
          event.preventDefault()
          const nextIndex = index <= 0 ? tags.length - 1 : index - 1
          setIndex(nextIndex)
          break
        case 'Tab':
        case 'Enter':
          event.preventDefault()
          Transforms.select(editor, tagTarget)
          insertTag(editor, tags[index])
          setTagTarget(null)
          break
        case 'Escape':
          event.preventDefault()
          setTagTarget(null)
          break
      }
    }
}

  useEffect(() => {
    if (tagTarget) {
      const el = tagRef.current
      const domRange = ReactEditor.toDOMRange(editor, tagTarget)
      const rect = domRange.getBoundingClientRect()

      el.style.top = `${rect.top + window.pageYOffset + 24}px`
      el.style.left = `${rect.left + window.pageXOffset}px`
    }
  }, [index, tagTarget, search])

  return (
    <div className="App">
      <div className="Card">
        <Slate
          editor={editor}
          value={value}
          onChange={newValue => {
            setValue(newValue)

            const {selection} = editor

            if (selection && Range.isCollapsed(selection)) {
              const [start] = Range.edges(selection)
              const wordBefore = Editor.before(editor, start, {unit: 'word'})
              const before = wordBefore && Editor.before(editor, wordBefore)
              const beforeRange = before && Editor.range(editor, before, start)
              const beforeText = beforeRange && Editor.string(editor, beforeRange)
              const beforeMatch = beforeText && beforeText.match(/^#(\w+)$/)
              const after = Editor.after(editor, start)
              const afterRange = Editor.range(editor, start, after)
              const afterText = Editor.string(editor, afterRange)
              const afterMatch = afterText.match(/^(\s|$)/)

              if (beforeMatch && afterMatch) {
                console.log(beforeRange)
                setTagTarget(beforeRange)
                setSearch(beforeMatch[1])
                setIndex(0)
                
                return
              }
            }

            setTagTarget(null)
          }}
        >
    
          <Editable
            renderElement={renderElement}
            onKeyDown={onKeyDown}
          />

          <Portal>
            <div
              ref={tagRef}
              style={{
                top: '-9999px',
                left: '-9999px',
                position: 'absolute',
                zIndex: 9999,
                background: '#fff',
                borderRadius: '3px',
                boxShadow: '0 0 0 1px rgba(99, 114, 130, 0.16), 0 8px 16px rgba(27, 39, 51, 0.08)',
              }}
            >
              {tags.map((tag, tagIndex) => (
                <div
                  key={tag}
                  style={{
                    color: "#333",
                    display: 'block',
                    textDecoration: 'none',
                    padding: '5px 15px 5px 10px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    background: tagIndex === index ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
                  }}
                >
                  #{tag}
                </div>
              ))}
            </div>
          </Portal>

        </Slate>
      </div>
    </div>
  );
}

const Element = props => {
  const {attributes, children, element} = props
  
  switch (element.type) {
    case 'tag':
      return <TagElement {...props} />
    default:
      return <>{children}</>
  }
}

const TagElement = ({attributes, children, element}) => {
  const selected = useSelected()
  const focused = useFocused()

  const span = (
    <span
      {...attributes}
      contentEditable={false}
      className={'tag-element'}
      style={{
        padding: '0 5px 0',
        margin: '0 1px',
        verticalAlign: 'baseline',
        display: 'inline-block',
        borderRadius: '3px',
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        color: "#333",
        fontWeight: "500",
        fontSize: '0.9em',
        cursor: "pointer",
        boxShadow: selected && focused ? '0 0 0 2px rgba(0, 0, 0, 0.1)' : 'none',
      }}
    >
      #{element.character}

      {/* {children} */}
    </span>
  )

  return span
}

const Portal = ({children}) => {
  return ReactDOM.createPortal(children, document.body)
}

const insertTag = (editor, tagText) => {
  if (!tagText) {
    return false
  }

  const tag = {
    type: 'tag',
    character: tagText,
    children: [{text: ''}]
  }
  Transforms.insertNodes(editor, tagText)
  Transforms.move(editor)
  Transforms.insertText(editor, " ")
}

const withTags = editor => {
  const {isInline, isVoid} = editor

  editor.isInline = element => {
    return ['tag'].includes(element.type) ? true : isInline(element)
  }

  editor.isVoid = element => {
    return ['tag'].includes(element.type) ? true : isVoid(element)
  }

  return editor
}

export default App;
