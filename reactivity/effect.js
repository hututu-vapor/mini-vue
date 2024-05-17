let activeEffect;

const bucket = new WeakMap();

const effectStack = []; // 副作用栈

const jobQueue = new Set(); // 任务队列

let isFlushing = false; // 刷新状态

const p = Promise.resolve();

const target = { foo: true, bar: true, count: 0 };

/**
 * 副作用注册的函数
 * @param {*} fn
 */
function effect(fn, options = {}) {
    const effectFn = () => {
        // 副作用函数在每次执行时会重新收集
        cleanup(effectFn);

        activeEffect = effectFn;

        effectStack.push(effectFn);

        const res = fn();

        effectStack.pop();

        activeEffect = effectStack[effectStack.length - 1];

        return res;
    };
    effectFn.options = options; // 注册调度器
    effectFn.deps = []; // 记录当前副作用函数处于那个依赖集合里面

    if (!options.lazy) {
        effectFn();
    }

    return effectFn;
}

const flushJob = () => {
    if (isFlushing) return;
    isFlushing = true;

    p.then(() => {
        jobQueue.forEach(job => job());
    }).finally(() => {
        isFlushing = false;
    });
};

const obj = new Proxy(target, {
    get(target, key) {
        track(target, key);

        return target[key];
    },
    set(target, key, value, receiver) {
        target[key] = value;
        trigger(target, key);
        return true;
    }
});

/** 清除掉副作用 */
function cleanup(effectFn) {
    for (let index = 0; index < effectFn.deps.length; index++) {
        const deps = effectFn.deps[index];
        deps.delete(effectFn);
    }

    effectFn.deps.length = 0;
}

/**
 * 收集依赖
 * @param {} target
 * @param {*} key
 * @returns
 */
function track(target, key) {
    if (!activeEffect) return;

    let depsMap = bucket.get(target);

    if (!depsMap) {
        bucket.set(target, (depsMap = new Map()));
    }

    // 获取当前对象属性的依赖集合
    let deps = depsMap.get(key);

    if (!deps) {
        depsMap.set(key, (deps = new Set()));
    }

    deps.add(activeEffect);
    activeEffect.deps.push(deps); // 记录当前副作用函数与那个依赖集合存在联系
}

/**
 * 派发更新
 * @param {*} target
 * @param {*} key
 * @param {*} val
 */
function trigger(target, key) {
    const depsMap = bucket.get(target);

    if (depsMap) {
        const effects = depsMap.get(key);

        const effectToRun = new Set();

        effects &&
            effects.forEach(fn => {
                if (fn !== activeEffect) {
                    effectToRun.add(fn);
                }
            });

        effectToRun &&
            effectToRun.forEach(fn => {
                if (fn.options.scheduler) {
                    fn.options.scheduler(fn);
                } else {
                    fn();
                }
            });
    }
}

effect(
    () => {
        console.log(obj.count);
    },
    {
        scheduler(fn) {
            jobQueue.add(fn);
            flushJob();
        }
    }
);

obj.count++;
obj.count++;

export { effect, track, trigger };
