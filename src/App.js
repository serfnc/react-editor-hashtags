import React, {useEffect, useMemo, useState, useCallback, useRef} from "react"
import {createEditor, Editor, Point, Range, Transforms, Node, Text} from 'slate'
import {Editable, ReactEditor, Slate, useEditor, useFocused, useReadOnly, useSelected, useSlate, withReact} from 'slate-react'
import ReactDOM from 'react-dom'
import escapeHtml from 'escape-html'

import './App.css';

const tagsList = ['liver', 'pain', 'right', 'left', 'pancreas', 'kidney', 'brain', 'severe_pain', 'tumour', 'cancer', 'MRI', 'CT', 'male', 'female', 'bone', 'shoulder', 'hip', 'XRAY', 'knee', 'spine', 'head', 'abdomen', 'contrast', 'fragment', 'detached', 'injury', 'torn', 'rotator', 'cuff', 'abdominal', 'dilatation']

const App = () => {
  const editor = useMemo(() => withTags(withReact(createEditor())), [])

  const tagRef = useRef(null)

  const [tagTarget, setTagTarget] = useState(null)
  const [index, setIndex] = useState(0)
  const [search, setSearch] = useState('')
  
  const [value, setValue] = useState([
    {
      type: 'paragraph',
      children: [{ text: 'A line of text in a paragraph.' }],
    }
  ])

  const renderElement = useCallback(props => <Element {...props} />, [])

  const onKeyDown = event => {
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


  let tags = tagsList.filter(c =>
    c.toLowerCase().startsWith(search.toLowerCase())
  ).slice(0, 10)

  if (tags && !tags.find(exactText => exactText.toLowerCase() == search.toLowerCase())) {
    tags = [search].concat(tags)
  }

  return (
    <div className="App">
      <div className="Card">
        <Slate
          editor={editor}
          value={value}
          onChange={newValue => {
            setValue(newValue)

            console.log('--------------------------')
            console.log('Original value', newValue)
            console.log('Text value', serializeText(newValue))
            console.log('HTML value', newValue.map(n => serializeHtml(n)).join(''))

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

          {tagTarget &&
            <Portal>
              <div ref={tagRef} className="TagsMenu">
                {tags.map((tag, tagIndex) => (
                  <div className="TagMenu" key={tag} style={{background: tagIndex === index ? 'rgba(0, 0, 0, 0.05)' : 'transparent'}} >
                    #{tag}
                  </div>
                ))}
              </div>
            </Portal>
          }
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
      className={'TagElement'}
      style={{
        boxShadow: selected && focused ? '0 0 0 2px rgba(0, 0, 0, 0.1)' : 'none',
        backgroundColor: tagsList.includes(element.character) ? 'rgba(0, 0, 0, 0.05)' : '#d4f5ff'
      }}
    >
      #{element.character}

      {children}
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

  Transforms.insertNodes(editor, {
    type: 'tag',
    character: tagText,
    children: [{text: `#${tagText}`}]
  })
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

const serializeText = node => {
  return node ? node.map(n => Node.string(n)).join('\n') : ''
}

const serializeHtml = node => {
  if (Text.isText(node)) {
    return escapeHtml(node.text)
  }

  const children = node && node.children ? node.children.map(n => serializeHtml(n)).join('') : []

  switch (node.type) {
    case 'tag':
      return `<span>${children}</span>`
    default:
      return children
  }
}


export default App;
