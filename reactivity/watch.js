import { effect } from './effect';

function watch(source, cb, options = {}) {
    let getters;

    if (typeof source === 'function') {
        getters = source;
    } else {
        getters = () => traverse(source);
    }

    let oldValue, newValue;

    let cleanup;

    function onValidate(fn) {
        cleanup = fn;
    }

    const job = () => {
        newValue = effectFn();
        // 每次调用回调函数前先 执行注册的副作用函数
        if (cleanup) {
            cleanup();
        }
        cb(oldValue, newValue, onValidate); // 当数据发生变化
        oldValue = newValue;
    };

    const effectFn = effect(getters(), {
        lazy: true,
        scheduler() {
            // 后置处理
            if ((options.flush = 'post')) {
                const p = Promise.resolve();
                p.then(job);
            } else {
                job();
            }
        }
    });

    // 立即执行
    if (options.immediate) {
        job();
    } else {
        oldValue = effectFn();
    }
}

/**
 *  递归收集属性的依赖
 * @param {*} value
 * @param {*} seen
 * @returns
 */
function traverse(value, seen = new Set()) {
    if (typeof value !== 'object' || value === null || seen.has(value)) {
        return;
    }
    seen.add(value);

    for (const k in value) {
        traverse(value[k], seen);
    }

    return value;
}

export default watch;
