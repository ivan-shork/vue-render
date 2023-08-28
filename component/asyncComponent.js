// 异步组件实现

import { TEXT_TYPE } from "../const"

export const asyncComp = (componentLoader) => {
    let componentVnode = null
    return {
        name: 'asyncComp',
        setup() {
            const loadSuccess = ref(false)
            componentLoader().then(component => {
                componentVnode = component
                loadSuccess.value = true
            })

            return () => {
                return loadSuccess.value 
                    ? { type: componentVnode }
                    : { type: TEXT_TYPE, children: 'error' } 
            }
        }
    }
}