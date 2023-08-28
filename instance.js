let currentInstance 

export const setCurrentInstance = (ctx) => {
    currentInstance = ctx
}

export const getCurrentInstance = (ctx) => {
    return currentInstance
}


export const onMounted = (callback) => {
    if(currentInstance) {
        currentInstance.mountedHooks.push(callback)
    } else {
        console.warn('hook 函数只能在setup中调用')
    }
}


export const onUpdated = (callback) => {
    if(currentInstance) {
        currentInstance.updatedHooks.push(callback)
    } else {
        console.warn('hook 函数只能在setup中调用')
    }
}
