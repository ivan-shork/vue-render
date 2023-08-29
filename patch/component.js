import { queueJob } from "../scheduler.js"
import { callFunc, hasChangeProps, resolveProps } from "../utils.js"
import { patch } from "./index.js"
import { onMounted, getCurrentInstance, setCurrentInstance } from '../instance.js'
// !挂载组件逻辑 十分重要
// !创建组件实例 修正props、attrs 响应式props、data 调用生命周期钩子 
// !在渲染上下文（组件实例）中调用render函数，产生副作用，并且生成_vnode，挂在组件实例上，供后续比对
/**
 * <MyComponent title="aaa" />
 * {
 *  type: MyComponent,
 *  props: {
 *      title: "aaa"
 *  }
 * }
 */
export const mountComponent = (vnode, el, anchor) => {
    const componentOptions = vnode.type
    const children = vnode.children
    
    let {render = () => null, data, props: propsOption, beforeCreate, created, beforeMount, mounted, beforeUpdate, updated, setup = () => null} = componentOptions

    const [props, attrs, events] = resolveProps(propsOption, vnode.props)

    callFunc(beforeCreate)

    const state = data ? reactive(data()) : {}

    // ! 创建一个组件实例，这里只是简单的模拟，真正的组件实例是需要通过构造函数实例化出来的
    const instance = {
        state,
        isMounted: false,
        //! 相当于vue中的_vnode ，它是组件的vnode结构
        subTree: null,
        props: shallowReactive(props),
        $attrs: attrs,
        // 只需要将编译好的chilren作为slots对象传递给实例就行了
        $slots: children,
        mountedHooks: [],
        updatedHooks: [],
    }

    //! 组件类型的vnode独有的 它对标的其实是vue中的$vnode上的componentInstance
    vnode.component = instance

    setCurrentInstance(instance)

    const emit = (eveName, ...payload) => {
        if(!Object.keys(events)) {
            console.warn("the father component not inject event")
            return
        }
        if(eveName in events) {
            typeof events[eveName] === 'function' && events[eveName](...payload)
        }
    }
    // !供setup函数使用的第二个参数 上下文
    const setupContext = {
        attrs,
        emit
    }
    const setupResult = setup(instance.props, setupContext)
    let setupState = null
    // 返回值是函数，将用来做渲染函数
    if(typeof setupResult === 'function') {
        if(render) {
            console.warn('the return of setup func is a function type, that will cause the render func to be ignored')
        }
        render = setupResult
    } else {
        //!返回的对象也要加进渲染上下文里，供模版使用
        setupState = setupResult
    }

    // !创建组件渲染上下文，这样的话在模版中的this才可以拿到state、props及其他的东西... 
    // 在vue里面其实就是对应的是组件实例，就是当前组件的渲染上下文
    const renderContext = new Proxy(instance, {
        get(target, k, reveiver) {
            const {state, props} = target
            if(k in state) {
                return state[k]
            } else if(k in props) {
                return props[k]
            } else if(setupState && k in setupState) {
                return setupState[k]
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
            } else if(setupState && k in setupState) {
                console.log(k, value);
                setupState[k] = value
            } else {
                console.error('setting other keys is not allowed')
            }
        }
    })

    // !组件实例创建好了
    callFunc(created, renderContext)

    const mountedHooks = [mounted, ...instance.mountedHooks]

    effect(()=> {
        // 执行render的时候，收集这个副作用，
        // 用来当响应式数据发生变化时，重新执行render产生新的vnode来对比
        const subTree = (typeof render === 'function' && render.call(renderContext, renderContext)) || null
        if(!instance.isMounted) {
            callFunc(beforeMount, renderContext)
            patch(null, subTree, el, anchor)
            instance.isMounted = true
            mountedHooks.forEach(hook => {
                callFunc(hook, renderContext)
            })
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

export const patchComponent = (n1, n2, anchor) => {
    const instance = (n2.component = n1.component)
    const {props} = instance

    // vnode上的propsdata 变化的话才需要更新
    if(hasChangeProps(n1.props, n2.props)) {
        const [nextProps] = resolveProps(n2.type.props, n2.props)

        // !更新props 从而使子组件触发副作用函数重新生成vnode去patch 去（被动更新）
        for(let key in nextProps) {
            props[key] = nextProps[key]
        }

        // 删除旧的没有用到的props
        for(let k in props) {
            if(! (k in nextProps)) delete props[k]
        }

    }
}