"""Numerical and exact spot checks of authored answers, using only stdlib."""
from math import atan, cos, exp, expm1, sin, log, log1p, pi, sqrt, isclose
from fractions import Fraction

def close(a,b,tol=1e-8):
    assert isclose(a,b,rel_tol=tol,abs_tol=tol),(a,b)

def integral(f,a,b,n=2000):
    h=(b-a)/n
    return h/3*(f(a)+f(b)+sum((4 if i%2 else 2)*f(a+i*h) for i in range(1,n)))

x=1e-5
close((expm1(2*x)-2*x)/x**2,2,2e-5)
close((sin(3*x)-3*x)/x**3,-4.5,2e-5)
close(integral(lambda x:x*log(1+x),0,1),.25)
close(integral(lambda x:x*log(1+x*x),0,1),log(2)-.5)
close(integral(lambda x:x*(1-x)+(1-x)**2/2,0,1),1/3)
close(integral(lambda x:(x*x-x**4)/2,0,1),1/15)
close(integral(lambda r:r**3,0,2)*pi/2,2*pi)
close((log1p(1e-3)-1e-3+1e-6/2)/1e-9,1/3,2e-3)
close(integral(lambda x:x*x*atan(x),0,1),pi/12-Fraction(1,6)+log(2)/6)
close(4*integral(lambda t:sin(t)**4,0,pi),3*pi/2)
close(8*integral(lambda t:sin(t)**4,0,pi/4),3*pi/4-2)
close(5000*(integral(lambda x:1/(1+x**5000),0,1,10000)-1),-log(2),2e-3)
# Mock D: high-order expansion, Wallis asymptotic, authored integrals and recurrence limits.
x=1e-3
close((exp(x)*cos(x)-1-x)/x**3,-Fraction(1,3),2e-4)
for n in [500,1000]:
    wallis=integral(lambda t:sin(t)**n,0,pi/2,10000)
    close(sqrt(n)*wallis,sqrt(pi/2),2e-3)
close(4*integral(lambda r:r**5,0,1)*integral(lambda t:cos(t)**4,0,2*pi),pi/2)
close(integral(lambda t:t*t*exp(-t),0,30,20000),2,5e-8)
close(2*integral(lambda x:x*(sqrt(x)-x*x),0,1),Fraction(3,10))
close(Fraction(16,3)*integral(lambda t:sin(t)**3*(cos(t)+sin(t)),0,pi/4),(pi-2)/2)
for n in [20,200]:
    value=integral(lambda x:x**n/(1+x),0,1,10000)
    previous=integral(lambda x:x**(n-1)/(1+x),0,1,10000)
    close(value+previous,1/n)
close(2000*integral(lambda x:x**2000/(1+x),0,1,20000),.5,3e-4)
# x_(n+1)=log(1+x_n) has n*x_n -> 2.
term=1.0
for n in range(1,20001):
    if n==20000:close(n*term,2,2e-3)
    term=log1p(term)
for x in [-1,0,.3,1]:
    close((exp(x)-1)-(exp(x)-x-1),x)
    close((4*exp(2*x)-exp(x))-3*(2*exp(2*x)-exp(x))+2*(exp(2*x)-exp(x)),0)
A=[[2,1,0],[1,2,0],[0,0,3]]
vectors=[[1/sqrt(2),-1/sqrt(2),0],[1/sqrt(2),1/sqrt(2),0],[0,0,1]]
for v,lam in zip(vectors,[1,3,3]):
    close(sum(c*c for c in v),1)
    for i in range(3):close(sum(A[i][j]*v[j] for j in range(3)),lam*v[i])
for a in [-3,0,2,5]:
    y=z=Fraction(1,a-1);x=1-y-z
    assert x+y+z==1 and x+a*y+z==2 and x+y+a*z==2
E=[[1,1,-1],[1,1,-1],[1,1,-1]]
A=[[2,1,-1],[1,2,-1],[1,1,0]]
alpha=[1,0,1];beta=[0,1,1];gamma=[1,1,1]
for v,lam in [(alpha,1),(beta,1),(gamma,2)]:
    assert [sum(A[i][j]*v[j] for j in range(3)) for i in range(3)]==[lam*t for t in v]
for i in range(3):
    for j in range(3):
        assert sum(E[i][k]*E[k][j] for k in range(3))==E[i][j]
print('PASS: representative basic and advanced limits/integrals, recurrences, exact systems, ODE and eigenvalue spot checks.')
