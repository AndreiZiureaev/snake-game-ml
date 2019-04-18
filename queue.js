class Queue {
    constructor() {
        this.head = null;
        this.tail = null;
        this.length = 0;
    }

    isEmpty() {
        return this.length === 0;
    }

    enqueue(value) {
        const node = { value, next: null };

        if (this.isEmpty()) {
            this.head = node;
            this.tail = node;
        } else {
            this.tail.next = node;
            this.tail = node;
        }

        this.length++;
    }

    dequeue() {
        if (this.isEmpty()) {
            return null;
        }

        const value = this.head.value;
        this.head = this.head.next;
        this.length--;

        return value;
    }

    peekLast() {
        if (this.isEmpty()) {
            return null;
        }

        return this.tail.value;
    }

    shift() {
        if (!this.isEmpty()) {
            this.head = this.head.next;
            this.length--;
        }
    }

    [Symbol.iterator]() {
        return {
            _node: this.head,
            next: function() {
                if (this._node === null) {
                    return {
                        done: true
                    };
                }

                const value = this._node.value;
                this._node = this._node.next;

                return {
                    value,
                    done: false
                };
            }
        };
    }
}
