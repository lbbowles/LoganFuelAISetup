<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ForumPost extends Model
{
    use HasFactory;

    protected $table = 'forum_posts';

    protected $fillable = [
        'category_id',  // ADDED
        'user_id',
        'title',
        'content',
    ];

    protected $attributes = [
        'category_id' => 1,  // ADDED - default value
    ];

    public function forum()
    {
        return $this->belongsTo(Forum::class, 'category_id');  // UPDATED - category_id is the foreign key
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function threads()
    {
        return $this->hasMany(ForumThread::class, 'post_id');
    }
}
