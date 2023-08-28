import { FRAGEMENT_TYPE, vnodeTypeCheck } from "./const.js"
import { queueJob } from "./scheduler.js"
import { callFunc, hasChangeProps, resolveProps } from "./utils.js"

const {reactive, effect, shallowReactive} = VueReactivity

export const createRenderer = (options = {}) => {

    // 抽象操作出来，方便各平台调用
    const { createElement, setElementText, insert, patchProps, createText, setText } = options
    
    const mountElement = (vnode, container, anchor) => {
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
    const patchElement = (n1, n2) => {
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

    const unmount = (vnode) => {
        if(vnode.type === FRAGEMENT_TYPE) {
            vnode.children.forEach(c => unmount(c))
        } else {
            const el = vnode.el
            const parentNode = el.parentNode
            if(parentNode) parentNode.removeChild(el)
        }
    }

    // 对比新旧节点 打补丁
    const patch = (n1, n2, container, anchor) => {
        if(n1 && n1.type !== n2.type) {
            // 类型不一样，可以直接删除老节点，挂载新节点
            unmount(n1)
            n1 = null
        }

        // 下面的全是类型一样的情况了，这时进入到真正的patch
        const {type} = n2
        const vnodeType = vnodeTypeCheck(type)
        if(vnodeType.isElement) {
            // 标签类型
            if(!n1) {
                // 没有存之前的，证明是第一次挂载
                mountElement(n2, container, anchor)
            } else {
                // 有的话进入两个vnode的对比
                patchElement(n1, n2)
            }
        } else if(vnodeType.isComp) {
            // 组件类型 
            if(!n1) {
                mountComponent(n2, container, anchor)
            } else {
                patchComponent(n1, n2, anchor)
            }
        } else if(vnodeType.isText) {
            // 文本节点类型
            if(!n1) {
                const el = n2.el = createText(n2.children)
                insert(el, container)
            } else {
                // 这里有个很重要的patch原则
                // ! 如果节点类型一样，并且能够复用节点的话，尽量复用节点去修改属性，而不是卸载老节点，挂载新节点
                const el = n2.el = n1.el
                if(n2.children !== n1.children) {
                    setText(el, n2.children)
                }
            }
        } else if(vnodeType.isFragement) {
            // 只渲染子节点就行了 不用理会标签
            if(!n1) {
                n2.children.forEach(child => patch(null, child, container))
            } else {
                patchChildren(n1, n2, container)
            }
        }
    }


    // !挂载组件逻辑 十分重要
    /**
     * <MyComponent title="aaa" />
     * {
     *  type: MyComponent,
     *  props: {
     *      title: "aaa"
     *  }
     * }
     */
    const mountComponent = (vnode, el, anchor) => {
        const componentOptions = vnode.type
        
        const {render = () => null, data, props: propsOption, beforeCreate, created, beforeMount, mounted, beforeUpdate, updated} = componentOptions

        const [props, attrs] = resolveProps(propsOption, vnode.props)

        callFunc(beforeCreate)

        const state = data ? reactive(data()) : {}

        // ! 创建一个组件实例，这里只是简单的模拟，真正的组件实例是需要通过构造函数实例化出来的
        const instance = {
            state,
            isMounted: false,
            //! 相当于vue中的_vnode ，它是组件的vnode结构
            subTree: null,
            props: shallowReactive(props),
            $attrs: attrs
        }

        //! 组件类型的vnode独有的 它对标的其实是vue中的$vnode上的componentInstance
        vnode.component = instance

        // !创建组件渲染上下文，这样的话在模版中的this才可以拿到state、props及其他的东西... 
        // 在vue里面其实就是对应的是组件实例，就是当前组件的渲染上下文
        const renderContext = new Proxy(instance, {
            get(target, k, reveiver) {
                const {state, props} = target
                if(k in state) {
                    return state[k]
                } else if(k in props) {
                    return props[k]
                } else {
                    return target[k]
                }
            },
            set(target, k, value, receiver) {
                const {state, props} = target
                if(k in state) {
                    state[k] = value
                } else if(k in props) {
                    console.warn('can not mutation props from fatherComponent, Please use commit to update')
                } else {
                    console.error('setting other keys is not allowed')
                }
            }
        })

        // !组件实例创建好了
        callFunc(created, renderContext)

        effect(()=> {
            // 执行render的时候，收集这个副作用，
            // 用来当响应式数据发生变化时，重新执行render产生新的vnode来对比
            const subTree = (typeof render === 'function' && render.call(renderContext, renderContext)) || null
            if(!instance.isMounted) {
                callFunc(beforeMount, renderContext)
                patch(null, subTree, el, anchor)
                instance.isMounted = true
                callFunc(mounted, renderContext)
            } else {
                // 拿到老的vnode节点，即组件实例上上次缓存的节点
                callFunc(beforeUpdate, renderContext)
                //!!!!很重要，这一步是在vnode对比的关键一步，通常在响应式数据发生变更后，它会调用渲染函数产生一个新的vnode节点，即这里的subtree，然后和老的节点做比较。
                patch(instance.subTree, subTree, el, anchor)
                callFunc(updated, renderContext)
            }
            instance.subTree = subTree
        }, {
            scheduler: queueJob
        })

    }

    const patchComponent = (n1, n2, anchor) => {
        const instance = (n2.component = n1.component)
        const {props} = instance

        // vnode上的propsdata 变化的话才需要更新
        if(hasChangeProps(n1.props, n2.props)) {
            const [nextProps] = resolveProps(n2.type.props, n2.props)

            // 更新props
            for(let key in nextProps) {
                props[key] = nextProps[key]
            }

            // 删除旧的没有用到的props
            for(let k in props) {
                if(! (k in nextProps)) delete props[k]
            }

        }
    }



    /**
     * 
     * @param {*} n1 
     * @param {*} n2 
     * @param {*} el 
     * 
     * 新旧vnode子节点patch的核心，其实就是 3 * 3 九种情况
     * 新节点和旧节点都有相同的三种情况
     * 1. 没有子节点 2. 子节点是文本 3. 子节点是一组节点
     * 但是有些情况在代码编写时可以做到一种分支条件可以实现，因此实际上不用九种
     */
    const patchChildren = (n1, n2, el) => {
        const { children: n2Child } = n2 || {}
        const { children: n1Child } = n1 || {}
        if(typeof n2Child === 'string') {
            if(Array.isArray(n1Child)) {
                unmount(n1Child)
            }
            setElementText(el, n2Child)
        } else if(Array.isArray(n2Child )) {
            if(Array.isArray(n1Child)) {
                console.log(n2Child, n1Child);
                // ! 核心diff
                // 全部卸载旧的一组子节点，挂载新的一组子节点 不高效，此处举例
                // n1Child.forEach(child => unmount(child))
                // n2Child.forEach(child => patch(null, child, el))


                // 方式一 见readme 遍历其中children最短的，然后一一对比，然后在找出超出的进行遍历，如果老节点长度大于新节点，则有卸载，反之是挂载
                // 方式二 利用key来复用vnode，并且调整好顺序

                let lastIndex = 0 
                for(let i = 0;i<n2Child.length; i++) {
                    const newVnode = n2Child[i]
                    let find = false
                    for(let j = 0;j < n1Child.length; j++) {
                        const oldVnode = n1Child[j]
                        if(n2Child[i].key === n1Child[j].key) {
                            find = true
                            patch(oldVnode, newVnode, el)
                            if(j < lastIndex) {
                                // 说明vnode对应的真实dom需要移动
                                const prevVnode = n2Child[i - 1]
                                if(prevVnode) {
                                    // 找到前一个新的vnode的下一个节点作为猫点，插到它前面去
                                    const anchor = prevVnode.el.nextSibling
                                    insert(newVnode.el, el, anchor)
                                }
                            } else {
                                lastIndex = j
                            }
                            break
                        }
                    }

                    // 代表没有找到可以复用的key的新节点，需要进行挂载
                    if(!find) {
                        const prevVnode = n2Child[i - 1]
                        let anchor = null
                        if(prevVnode) {
                            // 如果有前一个，则挂在前一个后面
                            anchor = prevVnode.el.nextSibling
                        } else {
                            // 证明是第一个
                            anchor = el.firstChild
                        }
                        patch(null, newVnode, el, anchor)
                    }
                }

                // 当更新结束时，我们还需要判断是否有遗留的旧节点需要删除
                for(let i = 0; i<n1Child.length; i++) {
                    const oldNode = n1Child[i]
                    const has = n2Child.find(node => node.key === oldNode.key)
                    if(!has) {
                        unmount(oldNode)
                    }
                }
            } else {
                // 如果没有子节点，或子节点是文本节点的情况
                // 只需要清空文本，并且一个个patch 挂载新的子节点就行了
                setElementText(el, '')
                n2Child.forEach(child => patch(null, child, el))
            }
        } else {
            // 新子节点不存在
            if(typeof n1Child === 'string') {
                setElementText(el, '')
            } else if(Array.isArray(n1Child)) {
                n1Child.forEach(child => unmount(child))
            }
        }
    }

    const renderer = (vnode, container) => {
        if(vnode) {
            patch(container._vnode, vnode, container)
        } else {
            // 为null时证明想要 销毁组件
            if(container._vnode) {
                unmount(container._vnode)
            }
        }
        container._vnode = vnode
    }
    return {
        renderer
    }
}