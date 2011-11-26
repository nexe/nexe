var celery = require('../lib');

var objects = [
    
    {
        name: 'Craig',
        age: 21,
        bio: 'Cras dictum convallis fermentum. Quisque ut urna velit, at porta nibh. Nam iaculis dignissim nisl, non elementum tortor iaculis et. Curabitur vulputate, sapien eget'
    },
    
    
    {
        name: 'Tim',
        age: 21,
        bio: 'Praesent ligula est, pellentesque vel euismod vitae, condimentum convallis odio. Suspendisse potenti. Fusce lacus arcu, bibendum in gravida at, dictum vitae mauris. Cras viverra, dui ac elementum fringilla, purus mauris rutrum nibh, id ultrices diam magna id ante. Integer elit ligula, cursus at accumsan in, scelerisque at dui. Sed pellentesque justo sit amet nibh sodales sed malesuada nulla cursus. Maecenas eu felis leo, a volutpat sapien. Duis eget porta urna. Maecenas ligula elit, vulputate ac bibendum eu, dapibus ut lacus. Fusce ac tincidunt eros. Pellentesque ut turpis ac ante interdum rutrum. Suspendisse tempor lobortis semper.'
    },
    
    {
        name: 'Michael',
        age: 23,
        bio: 'Vestibulum ligula elit, vehicula a lacinia at, aliquet sed felis. In rutrum pulvinar ultrices. Donec interdum ullamcorper neque ut pretium. Donec varius massa vitae ipsum feugiat feugiat. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Fusce a nulla a odio congue hendrerit in non tellus. Cras gravida vestibulum augue vitae dapibus. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Fusce porttitor rutrum faucibus. Vivamus interdum porta orci, vitae fermentum nunc vestibulum at. Maecenas porttitor sollicitudin pharetra. Ut risus mauris, tincidunt vitae laoreet quis, rhoncus eget risus'
    },
    
    {
        name: 'Sarah',
        age: 19,
        bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin fringilla interdum nibh eget luctus. In facilisis varius lacus, ut adipiscing turpis posuere a. Nunc id sapien eu urna'
    }

];


celery.drawTable(objects, {
    columns: { 
        name: 15, 
        age: 5,
        bio: 30
    },
    
    horz: ' ',
    
});

celery.open();