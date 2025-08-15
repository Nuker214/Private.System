--[[
    MASSIVE LUA SCRIPT DEMONSTRATION
    This script showcases various Lua features and programming techniques
--]]

-----------------------
-- 1. BASIC VARIABLES --
-----------------------

local nilValue = nil
local booleanValue = true
local numberValue = 42
local floatValue = 3.14159
local stringValue = "Hello, Lua!"
local longString = [[
This is a long string
that spans multiple lines
and preserves all formatting
]]

print("Basic values:")
print("Boolean:", booleanValue)
print("Number:", numberValue)
print("Float:", floatValue)
print("String:", stringValue)
print("Long string:", longString)

-------------------------
-- 2. TABLE OPERATIONS --
-------------------------

-- Array-like table
local arrayTable = {10, 20, 30, 40, 50}

-- Dictionary-like table
local dictTable = {
    name = "Lua Script",
    version = 5.4,
    awesome = true
}

-- Mixed table
local mixedTable = {
    "apple", "banana",
    color = "yellow",
    count = 2,
    "cherry"
}

-- Table with table values
local nestedTable = {
    person = {
        name = "Alice",
        age = 30,
        address = {
            street = "123 Main St",
            city = "Luatown"
        }
    },
    scores = {95, 88, 76}
}

print("\nTable operations:")
print("Array table length:", #arrayTable)
print("Dict table name:", dictTable.name)
print("Mixed table [1]:", mixedTable[1])
print("Mixed table color:", mixedTable.color)
print("Nested table city:", nestedTable.person.address.city)

-- Table iteration
print("\nArray table items:")
for i, v in ipairs(arrayTable) do
    print(i, v)
end

print("\nDict table items:")
for k, v in pairs(dictTable) do
    print(k, v)
end

------------------------
-- 3. CONTROL STRUCTURES --
------------------------

-- If-elseif-else
local temperature = 25
print("\nTemperature analysis:")
if temperature > 30 then
    print("It's hot!")
elseif temperature > 20 then
    print("It's warm.")
elseif temperature > 10 then
    print("It's cool.")
else
    print("It's cold!")
end

-- While loop
local counter = 5
print("\nCountdown:")
while counter > 0 do
    print(counter)
    counter = counter - 1
end

-- Repeat until (do-while)
local x = 1
print("\nRepeat until:")
repeat
    print("x is", x)
    x = x * 2
until x > 10

-- Numeric for loop
print("\nMultiplication table (5):")
for i = 1, 10 do
    print(string.format("5 x %d = %d", i, 5 * i))
end

-- Generic for loop with pairs
print("\nMixed table contents:")
for k, v in pairs(mixedTable) do
    print(k, v)
end

---------------------
-- 4. FUNCTIONS --
---------------------

-- Basic function
local function greet(name)
    return "Hello, " .. name .. "!"
end

-- Function with multiple return values
local function calculate(x, y)
    return x + y, x - y, x * y, x / y
end

-- Variadic function
local function sum(...)
    local total = 0
    for i, v in ipairs({...}) do
        total = total + v
    end
    return total
end

-- Recursive function
local function factorial(n)
    if n <= 1 then
        return 1
    else
        return n * factorial(n - 1)
    end
end

-- Function as table value
local mathUtils = {
    square = function(x) return x * x end,
    cube = function(x) return x * x * x end
}

print("\nFunction examples:")
print(greet("World"))
local a, b, c, d = calculate(10, 2)
print("Calculate:", a, b, c, d)
print("Sum of 1-5:", sum(1, 2, 3, 4, 5))
print("Factorial of 5:", factorial(5))
print("Square of 9:", mathUtils.square(9))
print("Cube of 3:", mathUtils.cube(3))

------------------------
-- 5. METATABLES --
------------------------

-- Create a table with metatable for operator overloading
local Vector = {}
Vector.__index = Vector

function Vector.new(x, y)
    local v = {x = x or 0, y = y or 0}
    setmetatable(v, Vector)
    return v
end

function Vector.__add(a, b)
    return Vector.new(a.x + b.x, a.y + b.y)
end

function Vector.__tostring(v)
    return string.format("Vector(%f, %f)", v.x, v.y)
end

local v1 = Vector.new(1, 2)
local v2 = Vector.new(3, 4)
local v3 = v1 + v2

print("\nMetatable examples:")
print("v1:", v1)
print("v2:", v2)
print("v1 + v2:", v3)

-- Index metamethod example
local defaultTable = setmetatable({}, {
    __index = function(t, k)
        return "Default value for " .. tostring(k)
    end
})

print("\nDefault table value:", defaultTable.non_existent_key)

-----------------------
-- 6. COROUTINES --
-----------------------

local function producer()
    local items = {"apple", "banana", "cherry", "date"}
    for i, item in ipairs(items) do
        print("[Producer] sending:", item)
        coroutine.yield(item)
    end
    return "done"
end

local consumer = coroutine.create(producer)

print("\nCoroutine example:")
while true do
    local success, value = coroutine.resume(consumer)
    if not success then
        print("[Consumer] Error:", value)
        break
    end
    if coroutine.status(consumer) == "dead" then
        print("[Consumer] Received:", value)
        break
    end
    print("[Consumer] received:", value)
end

------------------------
-- 7. FILE I/O --
------------------------

-- Write to a file
local file = io.open("test.txt", "w")
if file then
    file:write("This is line 1\n")
    file:write("This is line 2\n")
    file:write(string.format("The value is %d\n", numberValue))
    file:close()
    print("\nFile written successfully")
else
    print("Failed to open file for writing")
end

-- Read from a file
local file = io.open("test.txt", "r")
if file then
    print("\nFile contents:")
    for line in file:lines() do
        print(line)
    end
    file:close()
else
    print("Failed to open file for reading")
end

-------------------------
-- 8. ERROR HANDLING --
-------------------------

local function riskyOperation(x)
    if x < 0 then
        error("Negative values not allowed")
    end
    return math.sqrt(x)
end

print("\nError handling:")
local status, result = pcall(riskyOperation, 16)
if status then
    print("Result:", result)
else
    print("Error:", result)
end

status, result = pcall(riskyOperation, -4)
if status then
    print("Result:", result)
else
    print("Error:", result)
end

-- xpcall with error handler
local function errorHandler(err)
    return "Caught error: " .. tostring(err)
end

status, result = xpcall(function() return riskyOperation(-9) end, errorHandler)
print("xpcall result:", result)

-------------------------
-- 9. MODULES --
-------------------------

-- Create a simple module
local mymodule = {}

function mymodule.sayHello()
    print("Hello from the module!")
end

function mymodule.addNumbers(a, b)
    return a + b
end

-- Use the module
print("\nModule example:")
mymodule.sayHello()
print("Module add:", mymodule.addNumbers(7, 3))

-------------------------
-- 10. ADVANCED TOPICS --
-------------------------

-- Closures
local function makeCounter()
    local count = 0
    return function()
        count = count + 1
        return count
    end
end

local counter1 = makeCounter()
local counter2 = makeCounter()

print("\nClosure counters:")
print("Counter1:", counter1())
print("Counter1:", counter1())
print("Counter2:", counter2())
print("Counter1:", counter1())

-- Tail calls
local function tailCallDemo(n)
    if n <= 0 then
        return "Done"
    end
    print("Tail call:", n)
    return tailCallDemo(n - 1)
end

print("\nTail call example:")
print(tailCallDemo(3))

-- Bitwise operations (Lua 5.3+)
if _VERSION >= "Lua 5.3" then
    print("\nBitwise operations:")
    local a = 0b1100
    local b = 0b1010
    print(string.format("a AND b = %04b", a & b))
    print(string.format("a OR b  = %04b", a | b))
    print(string.format("a XOR b = %04b", a ~ b))
    print(string.format("NOT a   = %04b", ~a & 0xF))
    print(string.format("a << 1  = %04b", a << 1))
    print(string.format("b >> 1  = %04b", b >> 1))
end

-- Environment manipulation
print("\nEnvironment:")
local env = {}
setmetatable(env, {__index = _G})
setfenv(1, env)

local secret = "I'm in a custom environment"
print("Secret in env:", secret)

-- Restore original environment
setfenv(1, _G)
print("Secret in global:", secret or "nil")

-------------------------
-- 11. FINAL OUTPUT --
-------------------------

print("\nScript execution complete!")
print("Lua version:", _VERSION)
print("Operating system:", os.getenv("OS") or "Unknown")
print("Current time:", os.date("%Y-%m-%d %H:%M:%S"))

--[[
    This massive Lua script covers:
    - Basic syntax and variables
    - Table operations and iteration
    - Control structures
    - Function definitions and usage
    - Metatables and operator overloading
    - Coroutines
    - File I/O operations
    - Error handling
    - Module creation
    - Advanced topics like closures and tail calls
    - Environment manipulation
]]
