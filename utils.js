export function shouldSetAsProps(key, el) {
    // 只读的
    if(key === 'form' && el.tagName === 'INPUT') return false

                // 判断是否在dom properties里
    return key in el
}

export const callFunc = (func, context) => {
    func && typeof func === 'function' && func.call(context)
}

//! 用来处理组件的上props的，区分开attrs、props、event
export function resolveProps (propsOption, props) {
    // 区分出组件的attrs，和props
    const rProps = {}
    const rAttrs = {}
    const rEvents = {}
    const eventReg = /^(@|on)(\w+)$/
    for(let key in props) {
        if(eventReg.test(key)) {
            const match = key.match(eventReg)
            const eveName = match[2]
            rEvents[eveName] = props[key]
            continue
        }
        if(key in propsOption) {
            rProps[key] = props[key]
        } else {
            rAttrs[key] = props[key]
        }
    }

    return [rProps, rAttrs, rEvents]
}

export function hasChangeProps (prevProps, nextProps) {
    const prevsKeys = Object.keys(prevProps)
    const nextKeys = Object.keys(nextProps)
    if(prevsKeys.length !== nextKeys.length) return true

    nextKeys.forEach(key => {
        if(nextProps[key] !== prevProps[key]) return true
    })

    return false
}