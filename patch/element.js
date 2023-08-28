import { patchChildren } from "./diff.js"
import { patch } from "./index.js"
import { createElement, insert, patchProps, setElementText } from "./utils.js"

export const mountElement = (vnode, container, anchor) => {
    const {type, props, children = []} = vnode
    const ele = vnode.el = createElement(type)

    // 设置节点属性
    if(props) {
        for(let key in props) {
            patchProps(ele, key, null, props[key])
        }
    }

    if(typeof children === 'string') {
        setElementText(ele, children)
    } else if(Array.isArray(children)) {
        // 一个个挂载子节点
        children.forEach(node => {
            patch(null, node, ele)
        })
    }

    insert(ele, container, anchor)
}

// 对比元素节点的
export const patchElement = (n1, n2) => {
    // !dom元素的复用
    const el = (n2.el = n1.el)
    const oldProps = n1.props
    const newProps = n2.props

    for(let key in newProps) {
        if(newProps[key] !== oldProps[key]) {
            patchProps(el, key, oldProps[key], newProps[key])
        }
    }

    for(const key in oldProps) {
        if(!(key in newProps)) {
            patchProps(el, key, oldProps[key], null)
        }
    }

    patchChildren(n1, n2, el)
}